import { Router } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth.js';
import { updateSessionSummary } from '../../utils/reports.js';

const router = Router();
router.use(adminAuthMiddleware);

// PUT /api/admin/orders/:orderId/items/:itemId
router.put('/:orderId/items/:itemId', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    const { quantity, price } = req.body;

    if (quantity < 0 || price < 0) {
      return res.status(400).json({ error: 'Некорректное значение количества или цены' });
    }

    const { sessionId } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('ORDER_NOT_FOUND');

      const orderItem = await tx.orderItem.findUnique({ where: { id: itemId } });
      if (!orderItem || orderItem.orderId !== orderId) throw new Error('ITEM_NOT_FOUND');

      const oldSubtotal = orderItem.subtotal;
      const newSubtotal = quantity * price;
      const difference = newSubtotal - oldSubtotal;

      // Update Order Item
      if (quantity === 0) {
        await tx.orderItem.delete({ where: { id: itemId } });
      } else {
        await tx.orderItem.update({
          where: { id: itemId },
          data: { quantity, price, subtotal: newSubtotal },
        });
      }

      // Check if order has any items left
      const remainingItems = await tx.orderItem.count({ where: { orderId } });

      // Calculate new order total
      let newTotalAmount = order.totalAmount + difference;

      if (remainingItems === 0) {
        // Delete entire order if no items left
        await tx.order.delete({ where: { id: orderId } });
        newTotalAmount = 0;
      } else {
        // Update Order total
        await tx.order.update({
          where: { id: orderId },
          data: { totalAmount: newTotalAmount },
        });
      }

      const balance = await tx.balance.findUnique({ where: { userId: order.userId } });
      const newBalanceAmount = balance.amount - difference;

      await tx.balance.update({
        where: { userId: order.userId },
        data: { amount: newBalanceAmount },
      });

      // Record balance history
      const actionType = difference > 0 ? 'Списание' : 'Возврат';
      await tx.balanceHistory.create({
        data: {
          userId: order.userId,
          adminId: req.adminId,
          amount: -difference,
          type: 'admin_order_correction',
          balanceAfter: newBalanceAmount,
          orderId: order.id,
          comment: `Редактирование заказа #${order.id}. ${actionType} ₽${Math.abs(difference)}`,
        },
      });

      return { sessionId: order.sessionId };
    });

    // Update global session summary (dish totals, user totals)
    await updateSessionSummary(prisma, sessionId);

    res.json({ message: 'Позиция обновлена' });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Заказ не найден' });
    if (err.message === 'ITEM_NOT_FOUND') return res.status(404).json({ error: 'Позиция не найдена' });
    console.error('Admin edit order error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
