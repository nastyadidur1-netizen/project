// Створення нової кімнати
async function createRoom() {
  if (!this.newRoomName.trim()) return;

  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/createRoom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        preset: 'private_chat',
        name: this.newRoomName.trim()
      })
    });

    const data = await res.json();

    if (data.room_id) {
      this.newRoomId = data.room_id;
      this.roomId = data.room_id;
      this.messages = [];
      this.lastSyncToken = '';
      await this.fetchRoomsWithNames();
      this.fetchMessages();
      alert(`Room ${this.newRoomName} created with ID: ${this.newRoomId}`);
    } else {
      console.error('Create room failed:', data);
      alert('Create room failed: ' + (data.error || 'Unknown error'));
    }

  } catch (e) {
    console.error('Create room error:', e);
    alert('Create room error: ' + e.message);
  }
}

// Завантаження кімнат з назвами
async function fetchRoomsWithNames() {
  if (!this.accessToken) return;

  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/joined_rooms', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    const data = await res.json();

    if (data.joined_rooms) {
      const roomPromises = data.joined_rooms.map(async (roomId) => {
        const nameRes = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        const nameData = await nameRes.json();
        return {
          roomId,
          name: nameData?.name || this.getRoomName(roomId) || roomId
        };
      });

      this.rooms = (await Promise.all(roomPromises))
        .sort((a, b) => a.roomId.localeCompare(b.roomId));

      if (this.rooms.length > 0 && !this.roomId) {
        this.roomId = this.rooms[0].roomId;
        this.fetchMessages();
        this.fetchRoomMembers(); // Завантаження учасників
      }
    }

  } catch (e) {
    console.error('Fetch rooms error:', e);
  }
}

// Отримання назви кімнати
function getRoomName(roomId) {
  return this.rooms.find(r => r.roomId === roomId)?.name || roomId;
}

// Перемикання між кімнатами
function switchRoom(roomId) {
  if (roomId) this.roomId = roomId;
  this.messages = [];
  this.lastSyncToken = '';
  this.fetchMessages();
  this.fetchRoomMembers(); // Завантаження учасників після перемикання
}

// Видалення (вихід з) кімнати
async function leaveRoom(roomId) {
  if (!this.accessToken || !roomId) return;

  if (!confirm(`Ви впевнені, що хочете покинути (видалити) кімнату?`)) return;

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