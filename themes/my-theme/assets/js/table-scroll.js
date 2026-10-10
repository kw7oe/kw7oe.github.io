function wrapTable(table) {
  if (table.closest('.table-scroll')) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-scroll';

  table.parentNode.insertBefore(wrapper, table);
  wrapper.appendChild(table);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.prose table').forEach(wrapTable);
});
