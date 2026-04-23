export async function updateSessionSummary(prisma, sessionId) {
  const session = await prisma.orderSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  const orders = await prisma.order.findMany({
    where: { sessionId: session.id },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // By dishes
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

  // By users
  const userSummary = {};
  for (const order of orders) {
    const uid = order.user.id;
    if (!userSummary[uid]) {
      userSummary[uid] = {
        userId: uid,
        userName: order.user.name,
        userEmail: order.user.email,
        orderCount: 0,
        totalSpent: 0,
      };
    }
    userSummary[uid].orderCount += 1;
    userSummary[uid].totalSpent += order.totalAmount;
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
  };

  await prisma.orderSession.update({
    where: { id: session.id },
    data: {
      summaryJson: JSON.stringify(summary),
    },
  });

  return summary;
}
