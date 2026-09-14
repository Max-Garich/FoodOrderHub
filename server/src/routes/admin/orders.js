import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { scheduleSessionSummary } from '../../utils/reports.js';

const router = Router();

// GET /api/manager/orders?date=YYYY-MM-DD&groupId=N — заказы за дату
// MANAGER: только своя группа; CANTEEN_HEAD и SUPER_ADMIN: все или ?groupId= конкретная
router.get('/', requireAuth, requireRole('MANAGER', 'CANTEEN_HEAD', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date, groupId } = req.query;

    const where = {};
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }
    if (req.user.role === 'MANAGER') {
      where.groupId = req.user.groupId;
    } else if (groupId) {
      where.groupId = parseInt(groupId);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        user: { select: { id: true, name: true, surname: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000, // защита от выгрузки всей базы заказов за все времена
    });

    res.json(orders);
  } catch (err) {
    console.error('Manager orders list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/manager/orders/:orderId/items/:itemId — редактирование позиции заказа
// MANAGER: только заказы своей группы; CANTEEN_HEAD и SUPER_ADMIN: все
router.put('/:orderId/items/:itemId', requireAuth, requireRole('MANAGER', 'CANTEEN_HEAD', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    const { quantity, price } = req.body;

    if (quantity === undefined || price === undefined || quantity < 0 || price < 0) {
      return res.status(400).json({ error: 'Некорректное значение количества или цены' });
    }

    // Проверка прав (до транзакции)
    const orderCheck = await prisma.order.findUnique({ where: { id: orderId } });
    if (!orderCheck) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    if (req.user.role === 'MANAGER') {
      // Заказы преподов (groupId = null) менеджеру недоступны
      if (orderCheck.groupId === null || orderCheck.groupId !== req.user.groupId) {
        return res.status(403).json({ error: 'Вы можете редактировать заказы только своей группы' });
      }
    }

    const { sessionId } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('ORDER_NOT_FOUND');

      const orderItem = await tx.orderItem.findUnique({ where: { id: itemId } });
      if (!orderItem || orderItem.orderId !== orderId) throw new Error('ITEM_NOT_FOUND');

      const dailyMenu = await tx.dailyMenu.findUnique({
        where: { id: orderItem.dailyMenuId },
      });

      // Корректировка счётчика порций
      const qtyDiff = quantity - orderItem.quantity;
      if (qtyDiff > 0) {
        // Увеличение — атомарная проверка remaining
        const upd = await tx.dailyMenu.updateMany({
          where: {
            id: orderItem.dailyMenuId,
            orderedQuantity: { lte: dailyMenu.maxQuantity - qtyDiff },
          },
          data: { orderedQuantity: { increment: qtyDiff } },
        });
        if (upd.count === 0) {
          throw new Error(`SOLD_OUT:${dailyMenu.itemName}`);
        }
      } else if (qtyDiff < 0) {
        // Уменьшение — вернуть порции
        await tx.dailyMenu.update({
          where: { id: orderItem.dailyMenuId },
          data: { orderedQuantity: { decrement: -qtyDiff } },
        });
      }

      const newSubtotal = quantity * price;
      const difference = newSubtotal - orderItem.subtotal;

      // Обновление позиции (qty=0 → удалить, порции уже возвращены выше)
      if (quantity === 0) {
        await tx.orderItem.delete({ where: { id: itemId } });
      } else {
        await tx.orderItem.update({
          where: { id: itemId },
          data: { quantity, price, subtotal: newSubtotal },
        });
      }

      const remainingItems = await tx.orderItem.count({ where: { orderId } });

      let newTotalAmount = order.totalAmount + difference;

      if (remainingItems === 0) {
        // Заказ пуст — удалить целиком (порции уже возвращены)
        await tx.order.delete({ where: { id: orderId } });
        newTotalAmount = 0;
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: { totalAmount: newTotalAmount },
        });
      }

      // Баланс — только для заказов с группой (не преподов)
      if (order.groupId !== null) {
        const balance = await tx.balance.findUnique({ where: { userId: order.userId } });
        if (balance) {
          const newBalanceAmount = balance.amount - difference;
          await tx.balance.update({
            where: { userId: order.userId },
            data: { amount: newBalanceAmount },
          });

          const actionType = difference > 0 ? 'Списание' : 'Возврат';
          await tx.balanceHistory.create({
            data: {
              userId: order.userId,
              managerId: req.user.id,
              amount: -difference,
              type: 'admin_order_correction',
              balanceAfter: newBalanceAmount,
              orderId: order.id,
              comment: `Редактирование заказа #${order.id}. ${actionType} ₽${Math.abs(difference)}`,
            },
          });
        }
      }

      return { sessionId: order.sessionId };
    }, {
      // Аналогично созданию заказа: запас под пиковую нагрузку
      timeout: 20000,
      maxWait: 20000,
    });

    // Планируем отложенный пересчёт сводки (дебаунс)
    scheduleSessionSummary(prisma, sessionId);

    res.json({ message: 'Позиция обновлена' });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Заказ не найден' });
    if (err.message === 'ITEM_NOT_FOUND') return res.status(404).json({ error: 'Позиция не найдена' });
    if (err.message.startsWith('SOLD_OUT')) {
      const name = err.message.split(':')[1] || '';
      return res.status(409).json({ error: `Недостаточно порций блюда «${name}»` });
    }
    console.error('Edit order error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
