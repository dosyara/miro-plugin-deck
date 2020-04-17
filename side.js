const APP_ID = '3074457347596948293';
let miro = window.miro;

const staticUrl = 'https://dosyara.github.io/miro-plugin-deck';

const deck36 = [
  'A_c',
  'K_c',
  'Q_c',
  'J_c',
  '10_c',
  '9_c',
  '8_c',
  '7_c',
  '6_c',

  'A_h',
  'K_h',
  'Q_h',
  'J_h',
  '10_h',
  '9_h',
  '8_h',
  '7_h',
  '6_h',

  'A_d',
  'K_d',
  'Q_d',
  'J_d',
  '10_d',
  '9_d',
  '8_d',
  '7_d',
  '6_d',

  'A_s',
  'K_s',
  'Q_s',
  'J_s',
  '10_s',
  '9_s',
  '8_s',
  '7_s',
  '6_s',
];

const shuffle = (arr) => {
  let currentIndex = arr.length;

  while (0 !== currentIndex) {
    const idx = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    const tmp = arr[currentIndex];
    arr[currentIndex] = arr[idx];
    arr[idx] = tmp;
  }

  return arr;
};

const getRandomBetween = (min = 0, max = 0) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

async function start() {
  const deck = shuffle([...deck36]);

  await createCardWidgets(
    deck.map((cardId) => ({
      x: 1000 + getRandomBetween(-5, 5),
      y: 1000 + getRandomBetween(-5, 5),
      r: getRandomBetween(-5, 5),
      cardImgId: 'back',
      data: { inDeck: true, cardId },
    }))
  );

  console.log('ok');
}

async function join() {
  await miro.board.widgets.create({
    type: 'text',
    text: `player #`,
    x: getRandomBetween(-100, 100),
    y: getRandomBetween(-100, 100),
    scale: 10,
    metadata: {
      [APP_ID]: {
        isPlayer: true,
        player: userId,
      },
    },
  });

  console.log('ok');
}

async function deal(n = 1) {
  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { inDeck: true } },
  });
  const cardsToDeal = cards.slice(0, n);

  miro.board.widgets.transformDelta(cardsToDeal, 0 - cardsToDeal[0].x, 0 - cardsToDeal[0].y);

  cardsToDeal.forEach((card, i) => {
    card.x = i * 100;
    card.y = getRandomBetween(-30, 30);
    card.metadata = {
      [APP_ID]: {
        onTable: true,
        cardId: card.metadata[APP_ID].cardId,
      },
    };
  });

  miro.board.widgets.update(cardsToDeal);
}

async function take() {
  console.log('take');

  document.querySelector('.take').disabled = true;

  const [player] = await miro.board.widgets.get({
    type: 'text',
    metadata: { [APP_ID]: { isPlayer: true, player: userId } },
  });
  const selected = (await miro.board.selection.get()).filter(({ metadata }) => metadata[APP_ID].onTable);

  miro.board.widgets.transformDelta(selected, player.x, player.y);

  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { inHand: true, player: userId } },
  });

  selected.forEach((card, i) => {
    card.x = player.x + getRandomBetween(0, 25);
    card.y = player.y + 100 + (i + cards.length) * 100;
    card.url = `${staticUrl}/cards/back.svg`;
    card.metadata = {
      [APP_ID]: {
        player: userId,
        inHand: true,
        cardId: card.metadata[APP_ID].cardId,
      },
    };
  });

  await miro.board.widgets.update(selected);

  await renderHand();

  document.querySelector('.take').disabled = true;
}

async function discard() {
  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { onTable: true, isOpen: true } },
  });

  if (!cards.length) return;

  miro.board.widgets.transformDelta(cards, -cards[0].x, 2000 - cards[0].y);

  cards.forEach((card) => {
    card.x = getRandomBetween(-10, 10);
    card.y = 2000;
    card.metadata = {
      [APP_ID]: {
        player: userId,
        inDiscard: true,
        cardId: card.metadata[APP_ID].cardId,
      },
    };
  });

  await miro.board.widgets.update(cards);
}

async function play(cardId, canvasX = 0, canvasY = 0) {
  const [card] = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { player: userId, inHand: true, cardId } },
  });

  miro.board.widgets.transformDelta([card], canvasX - card.x, canvasY - card.y);

  await createCardWidget({
    x: canvasX,
    y: canvasY,
    cardImgId: cardId,
    data: { cardId, onTable: true, isOpen: true },
  });

  await miro.board.widgets.deleteById(card.id);

  await renderHand();
}

async function flip() {
  const selected = (await miro.board.selection.get()).filter(({ metadata }) => metadata[APP_ID].onTable);

  await createCardWidgets(
    selected.map((card) => ({
      x: card.x,
      y: card.y,
      cardImgId: card.metadata[APP_ID].cardId,
      data: { cardId: card.metadata[APP_ID].cardId, onTable: true, isOpen: true },
    }))
  );

  await miro.board.widgets.deleteById(selected);
}

async function reset() {
  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: {} },
  });

  await miro.board.widgets.deleteById(cards);
}

function createCardWidget({ x = 0, y = 0, r = getRandomBetween(-15, 15), cardImgId = 'back', data = {} }) {
  return miro.board.widgets.create({
    type: 'image',
    url: `${staticUrl}/cards/${cardImgId}.svg`,
    x,
    y,
    rotation: r,
    metadata: {
      [APP_ID]: data,
    },
  });
}

function createCardWidgets(widgets) {
  return miro.board.widgets.create(
    widgets.map(({ x, y, r = getRandomBetween(-15, 15), cardImgId = 'back', data }) => ({
      type: 'image',
      url: `${staticUrl}/cards/${cardImgId}.svg`,
      x,
      y,
      rotation: r,
      metadata: {
        [APP_ID]: data,
      },
    }))
  );
}

async function init() {
  const [player] = await miro.board.widgets.get({
    type: 'text',
    metadata: { [APP_ID]: { isPlayer: true, player: userId } },
  });

  if (!player) {
    await join();
  }

  await renderControls();
}

async function renderHand() {
  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { player: userId, inHand: true } },
  });

  const res = cards
    .map(
      ({
        metadata: {
          [APP_ID]: { cardId },
        },
      }) =>
        `<div class='card' data-card-id='${cardId}'><img src='${staticUrl}/cards/${cardId}.svg' alt='${cardId}' /></div>`
    )
    .join('');

  document.querySelector('.hand').innerHTML = res;
}

async function renderControls() {
  if (userId === '3074457346513499319') {
    const res = `
      <button id="start">start</button>
      <button id="reset">reset</button>
      <br />
      <input type="number" id="numCards" value="1"/><button id="deal">deal</button>
      <br />
      <button id="flip">flip</button>
      <button id="discard">discard</button>
      <br />
      <button class="take Button">take</button>
  `;
    document.querySelector('.controls').innerHTML = res;

    document.querySelector('#start').addEventListener('click', start);
    document.querySelector('#deal').addEventListener('click', () => {
      deal(parseInt(document.querySelector('#numCards').value, 10));
    });
    document.querySelector('#flip').addEventListener('click', flip);
    document.querySelector('#discard').addEventListener('click', discard);
    document.querySelector('#reset').addEventListener('click', reset);
  } else {
    const res = `
      <button class="take Button">take</button>
  `;
    document.querySelector('.controls').innerHTML = res;
  }

  document.querySelector('.take').addEventListener('click', take);
}

const options = {
  draggableItemSelector: '.card',
  onClick: async (targetElement) => {
    targetElement.style.display = 'none';
    play(targetElement.dataset.cardId);
  },
  getDraggableItemPreview: () => {
    return {
      url:
        'data:image/png;base64,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',
    };
  },
  onDrop: async (canvasX, canvasY, targetElement) => {
    targetElement.style.display = 'none';
    play(targetElement.dataset.cardId, canvasX, canvasY);
  },
};

let userId;

window.addEventListener('DOMContentLoaded', (event) => {
  miro.onReady(async () => {
    console.log('init', miro);

    miro.board.ui.initDraggableItemsContainer(document.querySelector('.hand'), options);

    userId = await miro.currentUser.getId();

    console.log(userId);

    await init();
    await renderHand();
  });
});
