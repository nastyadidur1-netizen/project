async function sendMessage() {
  if (!this.newMessage.trim() || !this.roomId) return;
  const msg = this.newMessage.trim();
  this.newMessage = '';

  try {
    const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${this.roomId}/send/m.room.message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ msgtype: 'm.text', body: msg })
    });

    const data = await res.json();
    if (data.event_id) {
      this.messages.push({ id: data.event_id, body: msg, sender: this.userId });
    } else {
      console.error('Send failed:', data);
    }
  } catch (e) {
    console.error('Send message error:', e);
  }
}

async function fetchMessages() {
  if (!this.accessToken || !this.roomId) return;

  try {
    const url = this.lastSyncToken ?
      `https://matrix.org/_matrix/client/r0/sync?since=${this.lastSyncToken}&timeout=30000` :
      `https://matrix.org/_matrix/client/r0/sync?timeout=30000`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    const data = await res.json();
    if (data.next_batch) {
      this.lastSyncToken = data.next_batch;

      if (data.rooms?.join?.[this.roomId]) {
        const roomData = data.rooms.join[this.roomId];
        roomData.timeline?.events?.forEach(event => {
          if (event.type === 'm.room.message' && !this.messages.find(m => m.id === event.event_id)) {
            this.messages.push({
              id: event.event_id,
              body: event.content.body,
              sender: event.sender
            });
          }
        });
      }

      if (data.rooms?.invite) {
        for (const [room] of Object.entries(data.rooms.invite)) {
          await this.joinRoom(room);
        }
      }

      await this.fetchRoomsWithNames();
    }
  } catch (e) {
    console.error('Fetch messages error:', e);
  }
  // --- Видалення (вихід з кімнати)
async function leaveRoom(roomId) {
  if (!this.accessToken || !roomId) return;

  if (!confirm(`Ви впевнені, що хочете покинути (видалити) кімнату?`)) {
    return;
  }

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/leave`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {
      this.rooms = this.rooms.filter(r => r.roomId !== roomId);
      if (this.roomId === roomId) {
        this.roomId = '';
        this.messages = [];
        this.roomMembers = [];
      }
      alert('Кімнату покинуто.');
      await this.fetchRoomsWithNames();
    } else {
      console.error('Leave failed:', data);
      alert('Не вдалося покинути кімнату: ' + (data.error || 'Невідома помилка'));
    }
  } catch (e) {
    console.error('Leave room error:', e);
    alert('Помилка: ' + e.message);
  }
}

// --- Викидання користувача з кімнати
async function kickUser(userId) {
  if (!this.accessToken || !this.roomId || !userId) return;

  if (!confirm(`Викинути користувача ${userId} з кімнати?`)) {
    return;
  }

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/kick`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ user_id: userId })
      }
    );

    const data = await res.json();

    if (res.ok) {
      this.roomMembers = this.roomMembers.filter(m => m.userId !== userId);
      alert(`Користувач ${userId} викинутий з кімнати.`);
      await this.fetchRoomMembers();
    } else {
      console.error('Kick failed:', data);
      alert('Не вдалося викинути користувача: ' + (data.error || 'Невідома помилка'));
    }
  } catch (e) {
    console.error('Kick error:', e);
    alert('Помилка: ' + e.message);
  }
}
function chatApp() {
  return {
    accessToken: '',
    rooms: [],
    roomId: '',
    messages: [],
    roomMembers: [],

    // Інші твої функції...
    fetchRoomsWithNames: fetchRoomsWithNames,
    fetchRoomMembers: fetchRoomMembers,
    leaveRoom: leaveRoom,
    kickUser: kickUser,
  };
}

}