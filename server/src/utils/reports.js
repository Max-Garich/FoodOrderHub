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
          dishes: {},
        };
      }
      const g = groupAgg[order.groupId];
      g.orderCount += 1;
      g.totalRevenue += order.totalAmount;
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

  const summary = {
    sessionId: session.id,
    sessionDate: session.sessionDate,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    totalOrders: orders.length,
    totalRevenue,
    dishes: Object.values(dishSummary),
    users: Object.values(userSummary),
    groups: Object.values(groupAgg).map((g) => ({
      groupId: g.groupId,
      groupName: g.groupName,
      orderCount: g.orderCount,
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
