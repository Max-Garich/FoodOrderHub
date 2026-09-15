// ═══════════════════════════════════════════════
// Дебаунс пересчёта сводки.
// Раньше сводка пересчитывалась при КАЖДОМ заказе: при 1000 пользователей
// это O(N²) — 1000-й заказ грузит из БД все 999 предыдущих. Теперь
// горячие пути (создание/правка заказа) только планируют пересчёт,
// а сам пересчёт выполняется не чаще раза в DEBOUNCE_MS на сессию.
// Завершение сессии (sessions.js) вызывает updateSessionSummary напрямую —
// финальная сводка всегда точная.
// ═══════════════════════════════════════════════
const DEBOUNCE_MS = 15000;
const scheduledSummaries = new Map(); // sessionId → timeout

export function scheduleSessionSummary(prisma, sessionId) {
  if (scheduledSummaries.has(sessionId)) return; // уже запланирован
  const timer = setTimeout(async () => {
    scheduledSummaries.delete(sessionId);
    try {
      await updateSessionSummary(prisma, sessionId);
    } catch (err) {
      console.error('Session summary update error:', err);
    }
  }, DEBOUNCE_MS);
  // Не держать процесс из-за таймера
  if (timer.unref) timer.unref();
  scheduledSummaries.set(sessionId, timer);
}

export async function updateSessionSummary(prisma, sessionId) {
  const session = await prisma.orderSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  const orders = await prisma.order.findMany({
    where: { sessionId: session.id },
    include: {
      items: true,
      user: { select: { id: true, name: true, surname: true, email: true, position: true } },
      group: { select: { id: true, name: true } },
    },
  });

  // По блюдам (общая сводка)
  const dishSummary = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (!dishSummary[item.itemName]) {
        dishSummary[item.itemName] = { name: item.itemName, totalQuantity: 0, totalAmount: 0, buyers: [] };
      }
      dishSummary[item.itemName].totalQuantity += item.quantity;
      dishSummary[item.itemName].totalAmount += item.subtotal;
      dishSummary[item.itemName].buyers.push({
        userName: order.user.name,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
    }
  }

  // По пользователям
  const userSummary = {};
  for (const order of orders) {
    const uid = order.user.id;
    if (!userSummary[uid]) {
      userSummary[uid] = {
        userId: uid,
        userName: order.user.name,
        userSurname: order.user.surname,
        userEmail: order.user.email,
        orderCount: 0,
        totalSpent: 0,
      };
    }
    userSummary[uid].orderCount += 1;
    userSummary[uid].totalSpent += order.totalAmount;
  }

  // По группам (только группы с orderCount > 0) + преподаватели (groupId = null)
  const groupAgg = {};
  const teacherAgg = {};
  for (const order of orders) {
    if (order.groupId !== null) {
      if (!groupAgg[order.groupId]) {
        groupAgg[order.groupId] = {
          groupId: order.groupId,
          groupName: order.group?.name || `Группа #${order.groupId}`,
          orderCount: 0,
          totalRevenue: 0,
          people: new Set(),
          dishes: {},
        };
      }
      const g = groupAgg[order.groupId];
      g.orderCount += 1;
      g.totalRevenue += order.totalAmount;
      g.people.add(order.userId);
      for (const item of order.items) {
        if (!g.dishes[item.itemName]) {
          g.dishes[item.itemName] = { name: item.itemName, totalQuantity: 0, totalAmount: 0 };
        }
        g.dishes[item.itemName].totalQuantity += item.quantity;
        g.dishes[item.itemName].totalAmount += item.subtotal;
      }
    } else {
      // Заказ преподавателя
      const t = order.user;
      if (!teacherAgg[t.id]) {
        teacherAgg[t.id] = {
          userId: t.id,
          name: t.name,
          surname: t.surname,
          position: t.position,
          orderCount: 0,
          totalSpent: 0,
        };
      }
      teacherAgg[t.id].orderCount += 1;
      teacherAgg[t.id].totalSpent += order.totalAmount;
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const uniquePeople = new Set(orders.map((o) => o.userId));

  const summary = {
    sessionId: session.id,
    sessionDate: session.sessionDate,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    totalOrders: orders.length,
    peopleCount: uniquePeople.size,
    totalRevenue,
    dishes: Object.values(dishSummary),
    users: Object.values(userSummary),
    groups: Object.values(groupAgg).map((g) => ({
      groupId: g.groupId,
      groupName: g.groupName,
      orderCount: g.orderCount,
      peopleCount: g.people.size,
      totalRevenue: g.totalRevenue,
      dishes: Object.values(g.dishes),
    })),
    teachers: Object.values(teacherAgg),
  };

  await prisma.orderSession.update({
    where: { id: session.id },
    data: {
      summaryJson: JSON.stringify(summary),
    },
  });

  return summary;
}
