// public/js/publicaciones.js

document.addEventListener('DOMContentLoaded', () => {
  const feedContainer = document.getElementById('feed-container');
  const postForm = document.getElementById('create-post-form');
  const editPostForm = document.getElementById('edit-post-form');
  
  // Modals
  const createModal = document.getElementById('create-post-modal');
  const editModal = document.getElementById('edit-post-modal');
  const btnOpenCreate = document.getElementById('open-create-modal');
  const btnCloseCreate = document.getElementById('close-create-modal');
  const btnCloseEdit = document.getElementById('close-edit-modal');

  // Leer el usuario autenticado desde localStorage
  const _storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const currentUserId = _storedUser ? Number(_storedUser.id || _storedUser.id_usuario) : null;

  // Fijar la URL base al localhost:3000 para que funcione aunque el usuario abra el HTML con Live Server (5501)
  const API_BASE = 'http://localhost:3000';

  // --- Manejo de Modales ---
  btnOpenCreate.addEventListener('click', () => createModal.classList.add('active'));
  btnCloseCreate.addEventListener('click', () => createModal.classList.remove('active'));
  btnCloseEdit.addEventListener('click', () => editModal.classList.remove('active'));
  
  window.addEventListener('click', (e) => {
    if (e.target === createModal) createModal.classList.remove('active');
    if (e.target === editModal) editModal.classList.remove('active');
  });

  // --- Lógica de subida de imágenes a Base64 ---
  let currentBase64Image = '';
  let editBase64Image = '';

  const fileInput = document.getElementById('post-img');
  const fileNameDisplay = document.getElementById('file-name-display');
  fileInput.addEventListener('change', (e) => handleImageSelect(e, fileNameDisplay, (b64) => currentBase64Image = b64));

  const editFileInput = document.getElementById('edit-post-img');
  const editFileNameDisplay = document.getElementById('edit-file-name-display');
  editFileInput.addEventListener('change', (e) => handleImageSelect(e, editFileNameDisplay, (b64) => editBase64Image = b64));

  function handleImageSelect(e, displayElement, callback) {
    const file = e.target.files[0];
    if (file) {
      displayElement.textContent = file.name;
      const reader = new FileReader();
      reader.onload = function(event) {
        callback(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      displayElement.textContent = 'Ningún archivo seleccionado';
      callback('');
    }
  }

  // --- Cargar Feed ---
  async function loadFeed() {
    try {
      const res = await fetch(`${API_BASE}/api/publicaciones/feed`);
      if (!res.ok) throw new Error('Error en la respuesta del servidor');
      const data = await res.json();
      
      feedContainer.innerHTML = '';

      // Solo mostramos publicaciones
      const posts = data.publicaciones || [];
      if (posts.length === 0) {
        feedContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--ink-500);">Aún no hay publicaciones. ¡Sé el primero en compartir algo!</div>';
        return;
      }

      posts.forEach(item => {
        item.date = new Date(item.fecha_registro);
        feedContainer.appendChild(createPostCard(item));
      });

    } catch (err) {
      console.error('Error cargando el feed:', err);
      feedContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--danger-text);">Ocurrió un error al cargar el feed. ¿Reiniciaste el servidor Node.js en el puerto 3000?</div>';
    }
  }

  function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'feed-item';
    card.id = `post-${post.id_pub}`;
    
    const imgHtml = post.imagen_url ? `<img src="${post.imagen_url}" class="feed-image" alt="Post Image">` : '';

    // Botones de editar y borrar (Solo si es el autor. En este caso simulamos que currentUserId es el dueño)
    let actionButtonsHtml = '';
    if (post.id_usuario === currentUserId) {
      actionButtonsHtml = `
        <div class="feed-header-right">
          <button class="edit-btn" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="feed-header" style="margin-bottom: 1rem;">
        <div class="feed-header-left">
          <img src="${post.foto_perfil || 'img/default_avatar.png'}" alt="Avatar" class="feed-avatar" onerror="this.src='https://ui-avatars.com/api/?name='+encodeURIComponent('${post.nombre_usuario}')&background=ffadd0&color=d4407e">
          <div class="feed-meta">
            <h3>${post.nombre_usuario}</h3>
            <span>${post.date.toLocaleString()}</span>
          </div>
        </div>
        ${actionButtonsHtml}
      </div>
      <div class="feed-content">
        <h2>${post.titulo}</h2>
        <p>${post.descripcion}</p>
        ${imgHtml}
      </div>
      <div class="feed-actions">
        <button class="action-btn like-btn" data-id="${post.id_pub}">
          <i class="fas fa-heart"></i> <span class="like-count">${post.total_likes || 0}</span> Me gusta
        </button>
        <button class="action-btn comment-toggle-btn" data-id="${post.id_pub}">
          <i class="fas fa-comment"></i> Comentar
        </button>
      </div>
      <div class="comments-section" id="comments-${post.id_pub}">
        <div class="comments-list" id="comments-list-${post.id_pub}">
          <!-- Comments go here -->
        </div>
        <form class="add-comment-form" data-id="${post.id_pub}">
          <input type="text" placeholder="Escribe un comentario..." required>
          <button type="submit">Enviar</button>
        </form>
      </div>
    `;

    // Event listeners de post
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => toggleLike(post.id_pub, likeBtn));

    const toggleBtn = card.querySelector('.comment-toggle-btn');
    toggleBtn.addEventListener('click', () => {
      const section = document.getElementById(`comments-${post.id_pub}`);
      section.classList.toggle('active');
      if (section.classList.contains('active')) {
        loadComments(post.id_pub);
      }
    });

    const commentForm = card.querySelector('.add-comment-form');
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = commentForm.querySelector('input');
      addComment(post.id_pub, input.value, input);
    });

    if (post.id_usuario === currentUserId) {
      const deleteBtn = card.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => deletePost(post.id_pub));
      
      const editBtn = card.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => openEditModal(post));
    }

    return card;
  }

  // --- API Calls ---

  // Crear Post
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('post-title').value;
    const descripcion = document.getElementById('post-desc').value;
    const imagen_url = currentBase64Image;

    try {
      const res = await fetch(`${API_BASE}/api/publicaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ id_usuario: currentUserId, titulo, descripcion, imagen_url })
      });
      if (res.ok) {
        postForm.reset();
        fileNameDisplay.textContent = 'Ningún archivo seleccionado';
        currentBase64Image = '';
        createModal.classList.remove('active');
        loadFeed(); 
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Eliminar Post
  async function deletePost(id_pub) {
    if(!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/publicaciones/${id_pub}`, { method: 'DELETE' });
      if (res.ok) {
        document.getElementById(`post-${id_pub}`).remove();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Editar Post (Abrir Modal)
  function openEditModal(post) {
    document.getElementById('edit-post-id').value = post.id_pub;
    document.getElementById('edit-post-title').value = post.titulo;
    document.getElementById('edit-post-desc').value = post.descripcion;
    editFileNameDisplay.textContent = 'Mantener imagen actual (sube una nueva para cambiarla)';
    editBase64Image = ''; // Reset the base64 because we don't want to re-upload unless they select a new one
    editModal.classList.add('active');
  }

  // Editar Post (Submit)
  editPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_pub = document.getElementById('edit-post-id').value;
    const titulo = document.getElementById('edit-post-title').value;
    const descripcion = document.getElementById('edit-post-desc').value;
    const imagen_url = editBase64Image;

    try {
      const res = await fetch(`${API_BASE}/api/publicaciones/${id_pub}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion, imagen_url })
      });
      if (res.ok) {
        editPostForm.reset();
        editModal.classList.remove('active');
        loadFeed(); 
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Likes
  async function toggleLike(id_pub, btnElement) {
    try {
      const res = await fetch(`${API_BASE}/api/publicaciones/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ id_usuario: currentUserId, id_pub })
      });
      const data = await res.json();
      
      const countSpan = btnElement.querySelector('.like-count');
      let currentCount = parseInt(countSpan.textContent);

      if (data.liked) {
        btnElement.classList.add('liked');
        countSpan.textContent = currentCount + 1;
      } else {
        btnElement.classList.remove('liked');
        countSpan.textContent = Math.max(0, currentCount - 1);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Cargar Comentarios
  async function loadComments(id_pub) {
    try {
      const res = await fetch(`${API_BASE}/api/publicaciones/${id_pub}/comments`);
      const comments = await res.json();
      
      const list = document.getElementById(`comments-list-${id_pub}`);
      list.innerHTML = '';

      comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `
          <img src="${c.foto_perfil || 'img/default_avatar.png'}" class="feed-avatar" onerror="this.src='https://ui-avatars.com/api/?name='+encodeURIComponent('${c.nombre}')&background=ffadd0&color=d4407e">
          <div class="comment-content">
            <h4>${c.nombre}</h4>
            <p>${c.comentario}</p>
          </div>
        `;
        list.appendChild(div);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Añadir Comentario
  async function addComment(id_pub, comentario, inputEl) {
    try {
      const res = await fetch(`${API_BASE}/api/publicaciones/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ id_usuario: currentUserId, id_pub, comentario })
      });
      if (res.ok) {
        inputEl.value = '';
        loadComments(id_pub);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Init
  loadFeed();
});
