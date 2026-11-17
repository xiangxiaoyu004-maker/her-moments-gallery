(() => {
  const data = window.GALLERY_PHOTOS;
  const root = document.querySelector('.exhibition');
  const space = root.querySelector('.space');
  const slider = root.querySelector('.journey');
  const counter = root.querySelector('.current');
  const viewer = document.querySelector('.viewer');
  const viewerImage = viewer.querySelector('.viewer-photo');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = data.length;
  let target = 0, position = 0, frame = 0;
  let pointerX = 0, pointerY = 0;
  let drag = null, suppressClick = false, wheelTimer = 0;
  let selected = 0, origin = null, closing = false;
  const wrap = value => (value + count) % count;
  const format = index => String(index + 1).padStart(2, '0');
  const cards = data.map((photo, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'photo';
    card.style.setProperty('--aspect', photo.width / photo.height);
    card.setAttribute('aria-label', `放大第 ${index + 1} 张照片`);
    const image = document.createElement('img');
    image.className = 'photo-image'; image.alt = ''; image.decoding = 'async'; image.draggable = false;
    image.width = photo.width; image.height = photo.height;
    const caption = document.createElement('span');
    caption.className = 'number';
    caption.innerHTML = `<span>${photo.id}</span><span>HER MOMENTS</span>`;
    card.append(image, caption); space.append(card);
    card.addEventListener('click', () => { if (!suppressClick) openPhoto(index, card); });
    return card;
  });
  function draw() {
    const width = space.clientWidth, height = space.clientHeight;
    cards.forEach((card, index) => {
      let delta = index - position;
      delta -= Math.round(delta / count) * count;
      const distance = Math.abs(delta);
      card.hidden = distance > 4.6;
      if (card.hidden) return;
      const image = card.querySelector('img');
      if (!image.getAttribute('src')) image.src = data[index].thumb;
      const angle = delta * 1.15;
      const depth = 90 - distance * 115;
      const x = Math.sin(angle) * width * .36 + pointerX * 25 / (1 + distance);
      const y = Math.sin(delta * .76) * height * .29 - Math.min(distance, 4) * 12 + pointerY * 16 / (1 + distance);
      const ratio = data[index].width / data[index].height;
      const cardWidth = Math.min(width < 600 ? 145 : 215, width * .42, Math.max(180, height * .8) * ratio) / (1 + distance * .035);
      card.style.width = `${cardWidth}px`;
      card.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${depth}px) rotateY(${-Math.sin(angle) * 15 + pointerX * 3}deg) rotate(${Math.sin(index * 2.7) * 7}deg)`;
      card.style.filter = `brightness(${Math.max(.45, 1 - distance * .12)})`;
      card.style.zIndex = String(20 - Math.round(distance * 2));
    });
    slider.value = String(target);
    counter.textContent = format(Math.round(target));
    slider.setAttribute('aria-valuetext', `第 ${Math.round(target) + 1} 张，共 ${count} 张`);
  }
  function tick() {
    frame = 0;
    const difference = target - position;
    position = reducedMotion || Math.abs(difference) < .001 ? target : position + difference * .14;
    draw();
    if (Math.abs(target - position) > .001) frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(tick); }
  function travel(value) { target = Math.max(0, Math.min(count - 1, value)); schedule(); }
  function step(direction) { travel(wrap(Math.round(target) + direction)); }
  root.querySelector('.gallery-previous').addEventListener('click', () => step(-1));
  root.querySelector('.gallery-next').addEventListener('click', () => step(1));
  slider.addEventListener('input', () => travel(Number(slider.value)));
  slider.addEventListener('change', () => travel(Math.round(target)));
  space.addEventListener('wheel', event => {
    if (viewer.open) return;
    const amount = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? space.clientHeight : 1);
    const next = Math.max(0, Math.min(count - 1, target + amount * .003));
    if (next === target) return;
    event.preventDefault(); travel(next);
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => travel(Math.round(target)), 180);
  }, { passive: false });
  space.addEventListener('pointerdown', event => {
    if (event.button !== 0 || viewer.open) return;
    drag = { y: event.clientY, position: target }; suppressClick = false;
  });
  space.addEventListener('pointermove', event => {
    if (drag) {
      const movement = drag.y - event.clientY;
      if (Math.abs(movement) > 7) {
        suppressClick = true;
        if (!space.hasPointerCapture(event.pointerId)) space.setPointerCapture(event.pointerId);
      }
      travel(drag.position + movement / 115);
    } else if (event.pointerType === 'mouse' && !viewer.open) {
      const rect = space.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - .5;
      pointerY = (event.clientY - rect.top) / rect.height - .5;
      schedule();
    }
  });
  function release() {
    if (!drag) return;
    drag = null; travel(Math.round(target));
    setTimeout(() => { suppressClick = false; }, 80);
  }
  space.addEventListener('pointerup', release);
  space.addEventListener('pointercancel', release);
  space.addEventListener('pointerleave', () => {
    pointerX = 0; pointerY = 0;
    if (drag && !suppressClick) drag = null;
    schedule();
  });
  function animateImage(sourceRect) {
    if (reducedMotion) return;
    const rect = viewerImage.getBoundingClientRect();
    if (!rect.width || !sourceRect.width) return;
    viewerImage.animate([
      { transform: `translate(${sourceRect.x + sourceRect.width / 2 - rect.x - rect.width / 2}px,${sourceRect.y + sourceRect.height / 2 - rect.y - rect.height / 2}px) scale(${sourceRect.width / rect.width},${sourceRect.height / rect.height})`, opacity: .8 },
      { transform: 'translate(0,0) scale(1)', opacity: 1 }
    ], { duration: 550, easing: 'cubic-bezier(.18,.8,.2,1)' });
  }
  function showPhoto(index) {
    selected = wrap(index);
    const photo = data[selected];
    viewerImage.getAnimations().forEach(animation => animation.cancel());
    viewerImage.width = photo.width; viewerImage.height = photo.height;
    viewerImage.alt = `第 ${selected + 1} 张照片`;
    viewerImage.src = photo.thumb;
    viewer.querySelector('.viewer-counter').textContent = `${format(selected)} / ${count}`;
    const full = new Image();
    full.onload = () => { if (viewer.open && selected === index) viewerImage.src = full.src; };
    full.src = photo.full;
  }
  function openPhoto(index, card) {
    origin = card; closing = false;
    const rect = card.querySelector('img').getBoundingClientRect();
    showPhoto(index); viewer.showModal(); document.body.style.overflow = 'hidden';
    viewer.querySelector('.viewer-close').focus({ preventScroll: true });
    requestAnimationFrame(() => animateImage(rect));
  }
  function closePhoto() {
    if (closing || !viewer.open) return;
    closing = true;
    if (!reducedMotion && origin && !origin.hidden) {
      const from = viewerImage.getBoundingClientRect(), to = origin.querySelector('img').getBoundingClientRect();
      viewerImage.getAnimations().forEach(animation => animation.cancel());
      const animation = viewerImage.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${to.x + to.width / 2 - from.x - from.width / 2}px,${to.y + to.height / 2 - from.y - from.height / 2}px) scale(${to.width / from.width},${to.height / from.height})`, opacity: .15 }
      ], { duration: 220, easing: 'ease-in', fill: 'forwards' });
      animation.onfinish = () => viewer.close();
    } else viewer.close();
  }
  function switchPhoto(direction) {
    if (closing) return;
    showPhoto(wrap(selected + direction));
    if (!reducedMotion) viewerImage.animate([{ opacity: .35, transform: `translateX(${direction * 24}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' });
  }
  viewer.querySelector('.viewer-close').addEventListener('click', closePhoto);
  viewer.querySelector('.viewer-previous').addEventListener('click', () => switchPhoto(-1));
  viewer.querySelector('.viewer-next').addEventListener('click', () => switchPhoto(1));
  viewer.addEventListener('cancel', event => { event.preventDefault(); closePhoto(); });
  viewer.addEventListener('close', () => {
    closing = false; document.body.style.overflow = '';
    viewerImage.getAnimations().forEach(animation => animation.cancel());
    travel(selected);
    origin = cards[selected]; origin.hidden = false; origin.focus({ preventScroll: true });
  });
  let swipe = null;
  viewer.querySelector('.viewer-stage').addEventListener('pointerdown', event => { swipe = { x: event.clientX, y: event.clientY }; });
  viewer.querySelector('.viewer-stage').addEventListener('pointerup', event => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) switchPhoto(dx < 0 ? 1 : -1);
    swipe = null;
  });
  document.addEventListener('keydown', event => {
    if (event.target === slider || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    viewer.open ? switchPhoto(direction) : step(direction);
  });
  new ResizeObserver(schedule).observe(space);
  draw();
})();
