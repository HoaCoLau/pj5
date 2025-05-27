const userMessageTimestamps = {};
function canSend(userId) {
  const now = Date.now();
  userMessageTimestamps[userId] = userMessageTimestamps[userId] || [];
  userMessageTimestamps[userId] = userMessageTimestamps[userId].filter(ts => now - ts < 10000);
  if (userMessageTimestamps[userId].length >= 5) return false;
  userMessageTimestamps[userId].push(now);
  return true;
}
module.exports = canSend;