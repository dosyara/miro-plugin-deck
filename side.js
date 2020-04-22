const APP_ID = '3074457347596948293';
let miro = window.miro;

const staticUrl = 'https://dosyara.github.io/miro-plugin-deck';
// const staticUrl = 'http://modern-wombat-48.serverless.social';

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
const deck54 = [
  'A_c',
  'K_c',
  'Q_c',
  'J_c',
  '10_c',
  '9_c',
  '8_c',
  '7_c',
  '6_c',
  '5_c',
  '4_c',
  '3_c',
  '2_c',

  'A_h',
  'K_h',
  'Q_h',
  'J_h',
  '10_h',
  '9_h',
  '8_h',
  '7_h',
  '6_h',
  '5_h',
  '4_h',
  '3_h',
  '2_h',

  'A_d',
  'K_d',
  'Q_d',
  'J_d',
  '10_d',
  '9_d',
  '8_d',
  '7_d',
  '6_d',
  '5_d',
  '4_d',
  '3_d',
  '2_d',

  'A_s',
  'K_s',
  'Q_s',
  'J_s',
  '10_s',
  '9_s',
  '8_s',
  '7_s',
  '6_s',
  '5_s',
  '4_s',
  '3_s',
  '2_s',

  'joker',
  'joker',
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

async function start(deck) {
  const shuffledDeck = shuffle([...deck]);

  await createCardWidgets(
    shuffledDeck.map((cardId) => ({
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

async function deal(n = 1, perPlayer = false) {
  const players = await miro.board.widgets.get({
    type: 'text',
    metadata: { [APP_ID]: { isPlayer: true } },
  });

  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { inDeck: true } },
  });

  const cardsToDeal = cards.slice(0, n * (perPlayer ? players.length : 1));

  miro.board.widgets.transformDelta(cardsToDeal, 0 - cardsToDeal[0].x, 0 - cardsToDeal[0].y);

  cardsToDeal.forEach((card, i) => {
    let p = players[Math.floor(i / n)];
    card.x = perPlayer ? p.x + getRandomBetween(-30, 30) : i * 100;
    card.y = getRandomBetween(-30, 30);
    card.metadata = {
      [APP_ID]: perPlayer
        ? {
            player: p.metadata[APP_ID].player,
            inHand: true,
            cardId: card.metadata[APP_ID].cardId,
          }
        : {
            onTable: true,
            cardId: card.metadata[APP_ID].cardId,
          },
    };
  });

  miro.board.widgets.update(cardsToDeal);

  miro.board.broadcastData({ renderHand: true });
}

async function take() {
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

  document.querySelector('.take').disabled = false;
}

async function discard() {
  const cards = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { onTable: true, isOpen: true } },
  });

  if (!cards.length) return;

  miro.board.widgets.transformDelta(cards, -cards[0].x, 3000 - cards[0].y);

  cards.forEach((card) => {
    card.x = getRandomBetween(-10, 10);
    card.y = 3000;
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

async function play(cardId, canvasX = 0, canvasY = 0, inHidden) {
  const [card] = await miro.board.widgets.get({
    type: 'image',
    metadata: { [APP_ID]: { player: userId, inHand: true, cardId } },
  });

  miro.board.widgets.transformDelta([card], canvasX - card.x, canvasY - card.y);

  if (inHidden) {
    await createCardWidget({
      x: canvasX,
      y: canvasY,
      cardImgId: 'back',
      data: { cardId, onTable: true, isOpen: true },
    });
  } else {
    await createCardWidget({
      x: canvasX,
      y: canvasY,
      cardImgId: cardId,
      data: { cardId, onTable: true, isOpen: true },
    });
  }

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
      data: { cardId: card.metadata[APP_ID].cardId, inDeck: true, isOpen: true },
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

  const res = cards.length
    ? cards
        .map(
          ({
            metadata: {
              [APP_ID]: { cardId },
            },
          }) =>
            `<div class='card' data-card-id='${cardId}'><img src='${staticUrl}/cards/${cardId}.svg' alt='${cardId}' /></div>`
        )
        .join('') + `<div><label><input type="checkbox" id="inHidden"/> hidden</label><div>`
    : 'No cards';

  document.querySelector('.hand').innerHTML = res || 'No cards';
}

async function renderControls() {
  if (userId === '3074457346513499319') {
    const res = `
      <button id="start36">start 36</button>
      <button id="start54">start 54</button>
      <button id="start108">start 108</button>
      <button id="reset">reset</button>
      <br />
      <input type="checkbox" id="perPlayer"/><input type="number" id="numCards" value="1"/><button id="deal">deal</button>
      <br />
      <button id="flip">flip</button>
      <button id="discard">discard</button>
      <br />
      <button class="take Button">take</button>
  `;
    document.querySelector('.controls').innerHTML = res;

    document.querySelector('#start36').addEventListener('click', () => start(deck36));
    document.querySelector('#start54').addEventListener('click', () => start(deck54));
    document.querySelector('#start108').addEventListener('click', () => start([...deck54, ...deck54]));
    document.querySelector('#deal').addEventListener('click', () => {
      deal(parseInt(document.querySelector('#numCards').value, 10), document.querySelector('#perPlayer').checked);
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
    play(targetElement.dataset.cardId, undefined, undefined, document.querySelector('#inHidden').checked);
  },
  getDraggableItemPreview: () => {
    return {
      url:
        'data:image/png;base64,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',
    };
  },
  onDrop: async (canvasX, canvasY, targetElement) => {
    targetElement.style.display = 'none';
    play(targetElement.dataset.cardId, canvasX, canvasY, document.querySelector('#inHidden').checked);
  },
};

let userId;

window.addEventListener('DOMContentLoaded', (event) => {
  miro.onReady(async () => {
    console.log('init', miro);

    miro.board.ui.initDraggableItemsContainer(document.querySelector('.hand'), options);

    miro.addListener('DATA_BROADCASTED', async (e) => {
      console.log(e);
      await renderHand();
    });

    userId = await miro.currentUser.getId();

    await init();
    await renderHand();
  });
});
