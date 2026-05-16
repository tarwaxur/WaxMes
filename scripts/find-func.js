const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
['function hideDeleteModal','function confirmDelete','var pendingDeleteMsgId','var pendingRemoveMember','function removeFromGroupConfirm'].forEach(function(f) {
  const idx = html.indexOf(f);
  console.log(f + ': ' + (idx > -1 ? 'FOUND at ' + idx : 'NOT FOUND'));
});
