class CardsQueue {
    constructor() {
        this.items = {}
        this.frontIndex = 0
        this.backIndex = 0
    }
    enqueue(item) {
        this.items[this.backIndex] = item
        this.backIndex++
        return item
    }
    dequeue() {
        const item = this.items[this.frontIndex]
        delete this.items[this.frontIndex]
        this.frontIndex++
        return item
    }
    peek() {
        return this.items[this.frontIndex]
    }
    get printQueue() {
        return this.items;
    }
}

class CurrentDeck {
    constructor(deck) {
        this.deck = deck;
        this.intervals = [1, 2, 3, 5, 8, 13, 21, 34, 55, 90];
        this.cardsToLearn = this.buildCardsToLearn();
        this.updates = {};
    }

    buildDeckUpdateRequestBody() {
        let body = {};
        body["deck_id"] = this.deck._id;
        let requests = [];
        for (const [card_id, card] of Object.entries(this.updates)) {
            let card_body = {};
            card_body["card_id"] = card_id;
            card_body["new_question"] = card.question;
            card_body["new_answer"] = card.answer;
            card_body["new_date"] = card.date;
            card_body["new_last_was_wrong"] = card.last_was_wrong;
            card_body["new_last_interval"] = card.last_interval;
            requests.push(card_body);
        }
        body["requests"] = requests;
        return JSON.stringify(body)
    }

    buildCardsToLearn() {
        var cards = new CardsQueue;
        const now = Date.now();
        this.deck.cards.filter((card) => Date.parse(card.date) < now).forEach((card) => {cards.enqueue(card)});
        return cards
    }

    getTopCard() {
        return this.cardsToLearn.peek();
    }

    correctAnswer() {
        let currentCard = this.cardsToLearn.dequeue();
        if (currentCard.last_was_wrong) {
            currentCard.last_was_wrong = false;
            this.cardsToLearn.enqueue(currentCard);
        }
        else {
            let now = Date.now();
            let newIndex = Math.min(currentCard.last_interval + 1, this.intervals.length - 1);
            var newDate = new Date(now + this.intervals[newIndex] * 24 * 60 * 60 * 1000);
            currentCard.date = newDate.toJSON();
            currentCard.last_interval = newIndex;
        }
        this.updates[currentCard._id] = currentCard;
    }

    wrongAnswer() {
        let currentCard = this.cardsToLearn.dequeue();
        currentCard.last_was_wrong = true;
        currentCard.last_interval = -1;
        this.cardsToLearn.enqueue(currentCard);

        this.updates[currentCard._id] = currentCard;
    }

    getNextCardsInterval() {
        if (this.getTopCard().last_was_wrong) {
            return "<10min"
        }
        let index = this.getTopCard().last_interval + 1;
        index = Math.min(index, this.intervals.length);
        let numberOfDays = this.intervals[index]
        if (numberOfDays == 1) {
            return "1 day"
        }
        return `${numberOfDays} days`
    }

    isQueueEmpty () {
        return Object.keys(this.cardsToLearn.items).length === 0;
    }

    isUpdatesEmpty () {
        return Object.keys(this.updates).length === 0;
    }
}

async function getUserDecks() {
    const response = await fetch("decks");
    if (response.ok) {
        let data = await response.json();
        return data;
    }
    if (response.status == 401) {
        loadLoginPage();
        return
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function sendLoginRequest(formData) {
    var req = {
        method: "POST",
        body: formData,
    }
    const response = await fetch('token', req)
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function sendRegisterRequest(formData) {
    var req = {
        method: "POST",
        body: formData,
    }
    const response = await fetch('user', req)
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function sendLogoutRequest() {
    var req = {
        method: "POST"
    }
    const response = await fetch('logout', req);
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function sendCreateDeckRequest(requestBody) {
    var req = {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: requestBody,
    }
    const response = await fetch('decks', req);
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function sendCreateCardRequest(deck_id, requestBody) {
    var req = {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: requestBody,
    }
    const response = await fetch('cards/' + deck_id, req);
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function getDeck(deck_id) {
    var req = {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
    const response = await fetch("decks/" + deck_id, req);
    if (response.ok) {
        const deckData = await response.json();
        return deckData
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function sendDeckUpdates(updates) {
    var req = {
        method: "PUT",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: updates,
    }
    const response = await fetch('decks', req);
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function deleteDeck(deck_id) {
    var req = {
        method: "DELETE",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
    const response = await fetch('decks/' + deck_id, req);
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

async function deleteCard(card_id) {
    var req = {
        method: "DELETE",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
    const response = await fetch('cards/' + card_id, req);
    if (response.ok) {
        return response
    }
    const msg = await response.json();
    openMessageDialog(msg.detail);
}

function createLoginForm() {
    let appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    let loginFormTemplate = `
    <form id="login-form">
        <input type="text" name="username" id="username-field" class="login-form-field" placeholder="Username" maxlength="20">
        <input type="password" name="password" id="password-field" class="login-form-field" placeholder="Password" maxlength="20">
        <input type="submit" value="login" id="login-form-submit">
    </form>`;

    appContainer.innerHTML = loginFormTemplate;
    document.getElementById("login-form").addEventListener("submit", function (e) {
        e.preventDefault();
        manageLoginRequest(this);
    });
}

function createRegisterForm() {
    let appContainer = document.getElementById("app-container");

    let registerFormTemplate = `
    <form id="register-form">
        <input type="text" name="client_secret" id="invite-code-field" class="register-form-field" placeholder="Invite code" maxlength="64">
        <input type="text" name="username" id="username-field" class="register-form-field" placeholder="Username" maxlength="20">
        <input type="password" name="password" id="password-field" class="register-form-field" placeholder="Password" maxlength="20">
        <input type="submit" value="register" id="login-form-submit">
    </form>`;

    appContainer.innerHTML = registerFormTemplate;
    document.getElementById("register-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        await manageRegisterRequest(this);
    });
}

// HERE
function renderConfirmDeleteDialog(msg, callback) {
    let confirmDeleteDialog = document.getElementById("message-dialog");
    confirmDeleteDialog.showModal();

    dialogTemplate = `
    <h2>${msg}</h2>
    <div class="dialog-buttons">
        <div class="clickable" id="close-dialog">
            back
        </div>
        <div class="clickable" id="confirm-dialog">
            confirm
        </div>
    </div>`;

    confirmDeleteDialog.innerHTML = dialogTemplate;
    let closeDialog = document.getElementById("close-dialog");
    closeDialog.addEventListener("click", function(e) {
        e.preventDefault();
        confirmDeleteDialog.close();
    });

    let confirmDialog = document.getElementById("confirm-dialog");
    confirmDialog.addEventListener("click", function(e) {
        confirmDeleteDialog.close();
        callback();
    });
}

function createDeckContainer(deckData) {
    let deckName = deckData.name;
    let deckId = deckData._id;

    let deckContainerTemplate = `
        <div class="deck">
            <div class="deck-top clickable">
                <p>${deckName}</p>
                <span class="material-symbols-outlined size-48 symbol-big">play_arrow</span>
            </div>
            <div class="deck-bottom">
                <div class="delete clickable">
                    <div><span class="material-symbols-outlined size-48 symbol-big">delete</span></div>
                    <div>delete<br>deck</div>
                </div>
                <div class="list clickable">
                    <div><span class="material-symbols-outlined size-48 symbol-big">list</span></div>
                    <div>list<br>view</div>
                </div>
            </div>
        </div>`;
    
    let deckContainer = document.createElement("div");
    deckContainer.setAttribute("class", "deck-container");
    deckContainer.innerHTML = deckContainerTemplate;

    let topDiv = deckContainer.getElementsByClassName("deck-top")[0];
    topDiv.addEventListener("click", function (e) {
        e.preventDefault();
        loadCardsLearningPage(deckId);
    });

    let deleteDiv = deckContainer.getElementsByClassName("delete")[0];
    deleteDiv.addEventListener("click", async function (e) {
        e.preventDefault();
        await manageDeleteDeck(deckData._id);
    });

    let listDiv = deckContainer.getElementsByClassName("list")[0];
    listDiv.addEventListener("click", function (e) {
        e.preventDefault();
        loadListView(deckId);
    });

    return deckContainer
}

function createCreateDeckContainer() {
    let createDeckTemplate = `
    <div class="deck new-deck">
        <div class="add-new-deck clickable">
            <div><span class="material-symbols-outlined size-48 symbol-big">add</span></div>
            <div>add new deck</div>
        </div>
    </div>`;

    let deckContainer = document.createElement("div");
    deckContainer.setAttribute("class", "deck-container");
    deckContainer.innerHTML = createDeckTemplate;

    let createDeckDiv = deckContainer.getElementsByClassName("add-new-deck")[0];
    createDeckDiv.addEventListener("click", function (e) {
        e.preventDefault();
        renderCreateDeckForm();
    });

    return deckContainer
}

function renderDecks(decks) {

    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";
    for (const [deck_id, deck] of Object.entries(decks)) {
        appContainer.append(createDeckContainer(deck));
    }
    appContainer.appendChild(createCreateDeckContainer());
}

function renderCreateDeckForm() {
    appContainer.innerHTML = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">arrow_back_ios_new</span>
            </div>
            <div>
                <p>go back</p>
            </div>
        </div>
    </div>
    <form id="create-deck-form">
        <input type="text" name="name" id="deck-name-field" placeholder="name" class="create-deck-form-field" maxlength="64">
        <input type="submit" value="add" id="create-new-deck-form-submit">
    </form>`;

    let backButton = document.getElementById("back");
    backButton.addEventListener("click", function (e) {
        e.preventDefault();
        loadHomePage();
    });

    document.getElementById("create-deck-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        await manageCreateDeck(this);
    });
}

function renderCreateCardForm(deck_id, callback) {
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">arrow_back_ios_new</span>
            </div>
            <div>
                <p>go back</p>
            </div>
        </div>
    </div>
    <form id="create-card-form">
        <input type="text" name="question" id="card-question-field" placeholder="question" maxlength="64">
        <input type="text" name="answer" id="card-answer-field" placeholder="answer" maxlength="64">
        <input type="submit" value="add" id="create-new-card-form-submit">
    </form>`;

    let backButton = document.getElementById("back");
    backButton.addEventListener("click", function (e) {
        e.preventDefault();
        callback();
    });
    
    document.getElementById("create-card-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        await manageCreateCard(deck_id, this);
    });
}

function getEta(date) {
    let now = Date.now();
    date = Date.parse(date);
    let difference = date - now;
    if (difference < 0) return "now";
    let days = Math.floor(difference / (24 * 60 * 60 * 1000));
    if (days == 0) return "< 1 day";
    if (days == 1) return "1 day+";
    return `${days} days+`;
}

function renderEditCardViewFromList(deckId, cardData) {
    let oldQuestion = cardData.question;
    let oldAnswer = cardData.answer;
    appContainer.innerHTML = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">arrow_back_ios_new</span>
            </div>
            <div>
                <p>go back</p>
            </div>
        </div>
    </div>
    <form id="edit-card-form">
        <input type="text" name="question" id="card-question-field" placeholder="question" value="${oldQuestion}" maxlength="64">
        <input type="text" name="answer" id="card-answer-field" placeholder="answer" value="${oldAnswer}" maxlength="64">
        <input type="submit" value="save" id="edit-card-form-submit">
    </form>`;

    document.getElementById("back").addEventListener("click", async function (e) {
        e.preventDefault();
        await loadListView(deckId);
    });

    document.getElementById("edit-card-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        await manageUpdateCardFromListView(this, cardData, deckId);
    });
}

function renderListView(deckData) {
    appContainer.innerHTML = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">arrow_back_ios_new</span>
            </div>
            <div>
                <p>go back</p>
            </div>
        </div>
        <div id="add-new-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">add</span>
            </div>
            <div>
                <p>add new card</p>
            </div>
        </div>
    </div>`;
    let backButton = document.getElementById("back");
    backButton.addEventListener("click", function (e) {
        e.preventDefault();
        loadHomePage();
    });

    let addNewCardButton = document.getElementById("add-new-card");
    addNewCardButton.addEventListener("click", function (e) {
        e.preventDefault();
        const callback = () => {
            return loadListView(deckData._id);
        }
        renderCreateCardForm(deckData._id, callback);
    });

    let table = document.createElement("div");
    table.setAttribute("class", "div-table");
    table.innerHTML = `
        <div class="table-head big">question</div>
        <div class="table-head big">answer</div>
        <div class="table-head small">due</div>`;
    for (const card of deckData.cards) {
        let row = document.createElement('div');
        row.setAttribute("class", "table-row");
        cells = `
			<div class="table-cell big">${card.question}</div>
			<div class="table-cell big">${card.answer}</div>
			<div class="table-cell small">${getEta(card.date)}</div>
            <div style="display: flex;">
                <div class="edit-card clickable">
                    <span class="material-symbols-outlined size-48 symbol-medium">edit</span>
                </div>
                <div class="delete-card clickable">
                    <span class="material-symbols-outlined size-48 symbol-medium">delete</span>
                </div>
            </div>`;
        row.innerHTML = cells;
        let editCardDiv = row.getElementsByClassName("edit-card")[0];
        editCardDiv.addEventListener("click", function (e) {
            renderEditCardViewFromList(deckData._id, card);
        });

        let deleteCardDiv = row.getElementsByClassName("delete-card")[0];
        deleteCardDiv.addEventListener("click", async function (e) {
            await manageDeleteCardFromListView(card._id, deckData._id);
        });
        table.appendChild(row);
    }
    appContainer.appendChild(table);
}

// ================ CARD LEARNING ================

function renderEditCardViewFromLearning(currentDeck) {
    let currentCard = currentDeck.getTopCard();
    let oldQuestion = currentCard.question;
    let oldAnswer = currentCard.answer;
    let editCardView = `
    <form id="edit-card-form">
        <input type="text" name="question" id="card-question-field" placeholder="question" value="${oldQuestion}" maxlength="64">
        <input type="text" name="answer" id="card-answer-field" placeholder="answer" value="${oldAnswer}" maxlength="64">
        <input type="submit" value="save" id="edit-card-form-submit">
    </form>`;

    appContainer.innerHTML = editCardView;
    let form = document.getElementById("edit-card-form")
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        let newQuestion = document.getElementById("card-question-field").value;
        let newAnswer = document.getElementById("card-answer-field").value;
        currentCard.question = newQuestion;
        currentCard.answer = newAnswer;
        currentDeck.updates[currentCard._id] = currentCard;
        renderCardsLearningPage(currentDeck);
    });
}

function createCardDiv(question, answer, showAnswer=false) {
    if (showAnswer) {
        var answerTemplate = `<p id="answer">${answer}</p>`;
    }
    else {
        var answerTemplate = `<p id="answer" style="display: none;">${answer}</p>`;
    }
    let cardTemplate = `
    <div id="current-card-top">
        <p id="question">${question}</p>
    </div>
    <div id="current-card-bottom">
        ${answerTemplate}
    </div>`;
    let outerDiv = document.createElement("div");
    outerDiv.setAttribute("id", "current-card");
    outerDiv.innerHTML = cardTemplate;
    return outerDiv
}

function disableButtons() {
    let showAnswer = document.getElementById("show-answer");
    let wrongAnswer = document.getElementById("wrong-answer");
    let correctAnswer = document.getElementById("correct-answer");
    showAnswer.style.display = "none";
    wrongAnswer.style.display = "none";
    correctAnswer.style.display = "none";
}

function loadCurrentCard(cur) {
    let cardData = cur.getTopCard();
    let cardContainer = document.getElementById("card-container");

    if (cardData) {
        var currentCard = createCardDiv(cardData.question, cardData.answer);
    }
    else {
        var currentCard = createCardDiv("<h1>🤓</h1>", "no cards left to study (for now)!", true);
    }
    cardContainer.appendChild(currentCard);
}

function updateIntervalInButton(nextInterval){
    let correctButtonText = document.getElementById("correct-button-text");
    correctButtonText.innerHTML = `correct (${nextInterval})`;
}

function refreshCardsLearningVariables(currentDeck) {
    loadCurrentCard(currentDeck);
    if (!currentDeck.isQueueEmpty()) {
        updateIntervalInButton(currentDeck.getNextCardsInterval());
    }
}

function renderCardsLearningPage(currentDeck) {
    let appContainer = document.getElementById("app-container");
    let cardsLearningPageTemplate = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">arrow_back_ios_new</span>
            </div>
            <div>
                <p>sync and go back</p>
            </div>
        </div>
        <div id="edit-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">edit</span>
            </div>
            <div>
                <p>edit card</p>
            </div>
        </div>
        <div id="add-new-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">add</span>
            </div>
            <div>
                <p>add new card</p>
            </div>
        </div>
        <div id="remove-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">delete</span>
            </div> 
            <div>
                <p>remove card</p>
            </div>
        </div>
    </div>
    <div id="card-container">
    </div>
    <div id="buttons-div" class="prevent-select">
        <div id="show-answer" class="clickable" style="display: block;">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">visibility</span>
            </div>
            <div>
                <p class="learning-button">show answer</p>
            </div>
        </div>
        <div id="wrong-answer" class="clickable" style="display: none;">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">close</span>
            </div>
            <div>
                <p class="learning-button">wrong answer</p>
            </div>
        </div>
        <div id="correct-answer" class="clickable" style="display: none;">
            <div>
                <span class="material-symbols-outlined size-48 symbol-medium">check</span>
            </div>
            <div>
                <p class="learning-button" id="correct-button-text"></p>
            </div>
        </div>
    </div>`;
    appContainer.innerHTML = cardsLearningPageTemplate;

    let backButton = document.getElementById("back");
    backButton.addEventListener("click", async function(e) {
        await manageBackFromLearningView(currentDeck);
    });

    let editCardButton = document.getElementById("edit-card");
    editCardButton.addEventListener("click", function(e) {
        if (!currentDeck.isQueueEmpty()) {
            renderEditCardViewFromLearning(currentDeck);
        }
    });

    let deleteCardButton = document.getElementById("remove-card");
    deleteCardButton.addEventListener("click", function(e) {
        manageDeleteCardFromLearningView(currentDeck);
    });

    let addNewCardButton = document.getElementById("add-new-card");
    addNewCardButton.addEventListener("click", function(e) {
            const callback = async function() {
                await sendDeckUpdates(currentDeck.buildDeckUpdateRequestBody());
                loadCardsLearningPage(currentDeck.deck._id);
            };
            renderCreateCardForm(currentDeck.deck._id, callback);
    });


    let showAnswer = document.getElementById("show-answer");
    if (currentDeck.isQueueEmpty()) {
        showAnswer.style.display = "none";
    }
    let wrongAnswer = document.getElementById("wrong-answer");
    let correctAnswer = document.getElementById("correct-answer");
    showAnswer.addEventListener("click", function(e) {
        let toDelete = document.getElementById("animated-card");
        if (toDelete) {
            toDelete.remove();
        }
        let answer = document.getElementById("answer");
        answer.style.display = "block";
        this.style.display = "none";
        wrongAnswer.style.display = "block";
        correctAnswer.style.display = "block";
    });

    correctAnswer.addEventListener("click", function(e) {
        let toDelete = document.getElementById("animated-card");
        if (toDelete) {
            toDelete.remove();
        }
        let currentCard = document.getElementById("current-card");
        currentCard.setAttribute("id", "animated-card");
        if (currentDeck.getTopCard().last_was_wrong) {
            currentCard.setAttribute("class", "reshuffle");
        }
        else {
            currentCard.setAttribute("class", "drop");
        }
        currentDeck.correctAnswer();
        if (!currentDeck.isQueueEmpty()) {
            this.style.display = "none";
            wrongAnswer.style.display = "none";
            showAnswer.style.display = "block";
        }
        else {
            this.style.display = "none";
            wrongAnswer.style.display = "none";
            showAnswer.style.display = "block";
            showAnswer.style.visibility = "hidden";
        }
        refreshCardsLearningVariables(currentDeck);
    });

    wrongAnswer.addEventListener("click", function(e) {
        let toDelete = document.getElementById("animated-card");
        if (toDelete) {
            toDelete.remove();
        }
        let currentCard = document.getElementById("current-card");
        currentCard.setAttribute("id", "animated-card");
        currentCard.setAttribute("class", "reshuffle");
        currentDeck.wrongAnswer();
        this.style.display = "none";
        correctAnswer.style.display = "none";
        showAnswer.style.display = "block";
        refreshCardsLearningVariables(currentDeck);
    });
    refreshCardsLearningVariables(currentDeck);
}

// ================ END CARD LEARNING ================
function loadDarkThemeButton() {
    localStorage.setItem("mode", "light");
    turnOffDarkMode();
    let themeControlDiv = document.getElementById("theme-control");
    let newThemeControlDiv = document.createElement("div");
    newThemeControlDiv.setAttribute("id", "theme-control");
    newThemeControlDiv.setAttribute("class", "clickable");
    newThemeControlDiv.innerHTML = `
        <div>
            <span class="material-symbols-outlined size-48 symbol-medium">dark_mode</span>
        </div>
        <div>
            dark
        </div>`;
    newThemeControlDiv.addEventListener("click", function(e) {
        e.preventDefault();
        loadLightThemeButton();
    });
    themeControlDiv.replaceWith(newThemeControlDiv);
}

function loadLightThemeButton() {
    localStorage.setItem("mode", "dark");
    turnOnDarkMode();
    let themeControlDiv = document.getElementById("theme-control");
    let newThemeControlDiv = document.createElement("div");
    newThemeControlDiv.setAttribute("id", "theme-control");
    newThemeControlDiv.setAttribute("class", "clickable");
    newThemeControlDiv.innerHTML = `
        <div>
            <span class="material-symbols-outlined size-48 symbol-medium">light_mode</span>
        </div>
        <div>
            light
        </div>`;
    newThemeControlDiv.addEventListener("click", function(e) {
        e.preventDefault();
        loadDarkThemeButton();
    });
    themeControlDiv.replaceWith(newThemeControlDiv);
}

function createUserControlButton(action, callback) {
    let symbolName = action;
    if (symbolName == "register") {
        symbolName = "app_registration";
    }
    let userControl = document.getElementById("user-control");
    userControl.innerHTML = `
    <div class="clickable">
        <div>
            <span class="material-symbols-outlined size-48 symbol-medium">${symbolName}</span>
        </div>
        <div>
            ${action}
        </div>
    </div>`;
    userControl.firstElementChild.addEventListener("click", function(e) {
        e.preventDefault();
        callback();
    });
}

const manageLogin = async () => {
    loadLoginPage();
}

const manageRegister = () => {
    loadRegisterPage();
}

const manageLogout = async () => {
    await sendLogoutRequest();
    loadLoginPage();
}

function turnOnDarkMode() {
    let body = document.body;
    body.classList.add("dark-mode");
}

function turnOffDarkMode() {
    let body = document.body;
    body.classList.remove("dark-mode");
}

function JSONFromFormData(form) {
    formData = new FormData(form);
    var JSONObject = {};
    formData.forEach((value, key) => JSONObject[key] = value);
    return JSON.stringify(JSONObject)
}

async function manageCreateCard(deck_id, createCardForm) {
    let requestBody = JSONFromFormData(createCardForm)
    enableModal();
    let response = await sendCreateCardRequest(deck_id, requestBody);
    disableModal();
    if (response) {
        createCardForm.question.value = "";
        createCardForm.answer.value = "";
    }
}

async function manageCreateDeck(createDeckForm) {
    let requestBody = JSONFromFormData(createDeckForm);
    enableModal();
    await sendCreateDeckRequest(requestBody);
    disableModal();
    loadHomePage();
}

async function manageLoginRequest(form) {
    let formData = new FormData(form);
    enableModal();
    let response = await sendLoginRequest(formData);
    disableModal();
    if (response){
        loadHomePage();
    }
}

async function manageRegisterRequest(form) {
    let formData = new FormData(form);
    enableModal();
    let response = await sendRegisterRequest(formData);
    disableModal();
    if (response){
        loadLoginPage();
    }
}

async function manageUpdateCardFromListView(form, cardData, deckId) {
    let newQuestion = form.question.value;
    let newAnswer = form.answer.value;
    let updates = {
        "deck_id": deckId,
        "requests": [
            {
                "card_id": cardData._id,
                "new_question": newQuestion,
                "new_answer": newAnswer,
                "new_date": cardData.date,
                "new_last_was_wrong": cardData.last_was_wrong,
                "new_last_interval": cardData.last_interval
            }
        ]
    }
    updates = JSON.stringify(updates);
    enableModal();
    let response = await sendDeckUpdates(updates);
    disableModal();
    if (response) {
        loadListView(deckId);
    }
}

async function manageDeleteDeck(deckId) {
    const callback = async () => {
        enableModal();
        await deleteDeck(deckId);
        disableModal();
        loadHomePage();}
    renderConfirmDeleteDialog("confirm delete deck", callback);
}


async function manageDeleteCardFromListView(cardId, deckId) {
    const callback = async () => {
        enableModal();
        let response = await deleteCard(cardId);
        disableModal();
        if (response) {
            loadListView(deckId);
        }
    };
    renderConfirmDeleteDialog("confirm delete card", callback);
}

async function manageDeleteCardFromLearningView(currentDeck) {
    if (!currentDeck.isQueueEmpty()) {
        let topCard = currentDeck.getTopCard();
        const callback = async () => {
            enableModal();
            await sendDeckUpdates(currentDeck.buildDeckUpdateRequestBody());
            await deleteCard(topCard._id);
            disableModal();
            loadCardsLearningPage(currentDeck.deck._id);
        }
        renderConfirmDeleteDialog("confirm delete card", callback);
    }
}

async function manageBackFromLearningView(currentDeck) {
    let requestBody = currentDeck.buildDeckUpdateRequestBody();
    enableModal();
    await sendDeckUpdates(requestBody);
    disableModal();
    loadHomePage();
}

async function loadHomePage() {
    createUserControlButton("logout", manageLogout);
    enableModal();
    decks = await getUserDecks();
    disableModal();
    if (decks) {
        let newDecks = {};
        decks.map((deck) => newDecks[deck._id] = deck);
        return renderDecks(newDecks);
    }
    return loadLoginPage();
}

function loadLoginPage() {
    createUserControlButton("register", manageRegister);
    createLoginForm();
}

function loadRegisterPage() {
    createUserControlButton("login", manageLogin);
    createRegisterForm();
}

async function loadCardsLearningPage(deck_id) {
    enableModal();
    let deckData = await getDeck(deck_id);
    disableModal();
    if (deckData) {
        let currentDeck = new CurrentDeck(deckData);
        renderCardsLearningPage(currentDeck);
    }
}

function enableModal() {
    const dialog = document.getElementById("waiting-modal");
    if (!dialog.open) {
        dialog.showModal();
    }
}

function disableModal() {
    const dialog = document.getElementById("waiting-modal");
    if (dialog.open) {
        dialog.close();
    }
}

async function loadListView(deckId) {
    enableModal();
    let deckData = await getDeck(deckId);
    disableModal();
    renderListView(deckData);
}


// HERE
function openMessageDialog(msg) {
    let dialog = document.getElementById("message-dialog");
    dialog.innerHTML = `
    <h2>${msg}</h2>
    <div class="dialog-buttons">
        <div class="clickable" id="close-dialog">
            back
        </div>
    </div>`;
    let closeDialog = document.getElementById("close-dialog");
    closeDialog.addEventListener("click", function(e) {
        e.preventDefault();
        dialog.close();
    });
    dialog.showModal();
}

function initialize() {
    if (localStorage.getItem("mode") == "dark") {
        loadLightThemeButton();
    }
    else {
        loadDarkThemeButton();
    }
    loadHomePage();
}

var appContainer = document.getElementById("app-container");
initialize();
