/* Shared pure transitions. Object IDs remain stable across boards, saves and plans. */
(function (root) {
  const copy = value => JSON.parse(JSON.stringify(value));
  function initial(input = {}) {
    return { version: 2, saved: [], boards: {}, versions: {}, plans: {}, recent: [], groups: [], owned: [], options: {}, resume: null, ...input };
  }
  function checkpoint(board) {
    const { history, future, ...value } = board;
    return copy(value);
  }
  function change(board, action) {
    const next = copy(board);
    if (action.type === 'undo' || action.type === 'redo') {
      const from = action.type === 'undo' ? 'history' : 'future', to = from === 'history' ? 'future' : 'history';
      const stack = [...(next[from] || [])], last = stack.pop();
      return last ? { ...last, [from]: stack, [to]: [...(next[to] || []), checkpoint(next)].slice(-30) } : next;
    }
    if (['replace', 'remove'].includes(action.type) && next.items.find(i => i.key === action.key)?.locked) return next;
    next.history = [...(next.history || []), checkpoint(next)].slice(-30); next.future = [];
    if (action.type === 'replace') next.items = next.items.map(i => i.key === action.key ? { ...copy(action.item), key: i.key, locked: false } : i);
    if (action.type === 'remove') next.items = next.items.filter(i => i.key !== action.key);
    if (action.type === 'toggle') next.items = next.items.map(i => i.key === action.key ? { ...i, [action.field]: !i[action.field] } : i);
    if (action.type === 'add') next.items.push(copy(action.item));
    if (action.type === 'preferences') Object.assign(next, action.value);
    next.updatedAt = Date.now(); return next;
  }
  function total(board, catalog) {
    return board.items.filter(i => !i.owned && i.selected !== false && i.type === 'catalog').reduce((sum, i) => sum + (catalog.find(p => p.id === i.id)?.price_cents || 0), 0);
  }
  function saveVersion(world, boardId, id) {
    const board = world.boards[boardId];
    const version = { ...checkpoint(board), id, boardId, createdAt: Date.now() };
    return { ...world, versions: { ...world.versions, [id]: version } };
  }
  function createPlan(id, title, context = {}) {
    return { id, title, date:'', occasion:'', place:'', budget:'',
      candidateIds: context.versionId ? [context.versionId] : [],
      inspirationKeys: context.inspirationKey ? [context.inspirationKey] : [],
      shares:[], archived:false, createdAt:Date.now() };
  }
  function category(item, product) {
    return /home|furniture|bedding|table|decor/i.test(product?.category || item?.category || '') ? 'Home' : 'Clothing';
  }
  function mergeOrders(world, receipts) {
    const next = copy(world);
    next.orders = next.orders || {};
    for (const receipt of Array.isArray(receipts) ? receipts : []) {
      if (!receipt || typeof receipt.id !== 'string' || !receipt.id.startsWith('cs_') ||
          !Array.isArray(receipt.items) || typeof receipt.test !== 'boolean' || next.orders[receipt.id]) continue;
      const lines = receipt.items.filter(i => i && typeof i.id === 'string' && i.product?.id === i.id &&
        typeof i.product.name === 'string' && ['retail','reservation'].includes(i.kind) &&
        Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 99);
      if (!lines.length) continue;
      next.orders[receipt.id] = { ...receipt, items: lines };
      for (const line of lines) {
        let record = next.saved.find(x => x.kind === 'product' && x.type === 'catalog' && x.id === line.id);
        if (!record) {
          record = {kind:'product', type:'catalog', id:line.id, key:'product:'+line.id,
            title:line.product.name, snapshot:line.product, at:receipt.paidAt, group:'', savedManually:false, status:receipt.test?'test-ordered':'ordered'};
          next.saved.push(record);
        }
        const key = receipt.test ? 'testOrderIds' : 'orderIds';
        record[key] = [...new Set([...(record[key] || []), receipt.id])];
        if (!receipt.test && record.status !== 'owned') record.status = 'ordered';
      }
    }
    return next;
  }
  const api = { initial, change, total, checkpoint, saveVersion, createPlan, category, copy, mergeOrders };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DigoJourney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
