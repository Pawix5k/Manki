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
        this.deck.cards.forEach(card => {
            if (Date.parse(card.date) < now) {
                cards.enqueue(card);
            }
        });
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
        return "${numberOfDays} days"
    }

    isQueueEmpty () {
        return Object.keys(this.cardsToLearn.items).length === 0;
    }

    isUpdatesEmpty () {
        return Object.keys(this.updates).length === 0;
    }
}


async function getUserDecks() {
    let response = await fetch(rootUrl + "decks");
    if (response.status !== 200) {
        loadLoginPage();
    }
    else {
        let data = await response.json();
        console.log(data);
        let newDecks = {}
        data.forEach(deck => {
            newDecks[deck._id] = deck;
        });
        return newDecks
    }
}

function sendLoginRequest() {
    var formElement = document.getElementById('login-form');
    var data = new FormData(formElement);
    var req = {
        method: "POST",
        body: data,
    }
    fetch(rootUrl + 'token', req)
        .then(function (response) {
            if (response.status !== 200) {
                console.log(
                    'Looks like there was a problem. Status Code: ' + response.status
                );
                loadLoginPage();
            }
            response.json()
                .then(function (data) {
                    loadHomePage();
            });
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}

async function sendRegisterRequest() {
    var formElement = document.getElementById('register-form');
    var data = new FormData(formElement);
    var req = {
        method: "POST",
        body: data,
    }
    let response = await fetch(rootUrl + 'user', req)
    loadLoginPage();
}

async function sendLogoutRequest() {
    var req = {
        method: "POST"
    }
    response = await fetch(rootUrl + 'logout', req);
    // data = await response.json();
    return response
}

async function sendCreateDeckRequest() {
    var deckName = document.getElementById('deck-name-field').value;
    var data = {name: deckName}
    data = JSON.stringify(data);
    var req = {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: data,
    }

    const response = await fetch(rootUrl + 'deck', req);
    data = await response.json();
    let newDecks = {}
    data.decks.forEach(deck => {
        newDecks[deck._id] = deck;
    });
    decks = newDecks;
    console.log(data);
    loadHomePage();
}

async function sendCreateCardRequest(deck_id) {
    var question = document.getElementById('card-question-field').value;
    var answer = document.getElementById('card-answer-field').value;
    var data = {"question": question, "answer": answer}
    data = JSON.stringify(data);
    var req = {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: data,
    }

    const response = await fetch(rootUrl + 'card/' + deck_id, req);
}

async function getDeck(deck_id) {
    var req = {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    const response = await fetch(rootUrl + "deck/" + deck_id, req);
    const deckData = await response.json();
    return deckData
}

async function sendDeckUpdates(updates) {
    var req = {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: updates,
    }

    const response = await fetch(rootUrl + 'deck_update', req);
    data = await response.json();
    return data
}

async function deleteDeck(deck_id) {
    var req = {
        method: "DELETE",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    const response = await fetch(rootUrl + 'deck/' + deck_id, req);
    return response
}

function createLoginForm() {
    let appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    let loginFormTemplate = `
    <form id="login-form">
        <input type="text" name="username" id="username-field" class="login-form-field" placeholder="Username">
        <input type="password" name="password" id="password-field" class="login-form-field" placeholder="Password">
        <input type="submit" value="Login" id="login-form-submit">
    </form>`;

    appContainer.innerHTML = loginFormTemplate;
    document.getElementById("login-form").addEventListener("submit", function (e) {
        e.preventDefault();
        enableModal();
        sendLoginRequest();
        disableModal();
    });
}

function createRegisterForm() {
    let appContainer = document.getElementById("app-container");

    let registerFormTemplate = `
    <form id="register-form">
        <input type="text" name="client_secret" id="invite-code-field" class="register-form-field" placeholder="Invite code">
        <input type="text" name="username" id="username-field" class="register-form-field" placeholder="Username">
        <input type="password" name="password" id="password-field" class="register-form-field" placeholder="Password">
        <input type="submit" value="Register" id="login-form-submit">
    </form>`;

    appContainer.innerHTML = registerFormTemplate;
    document.getElementById("register-form").addEventListener("submit", function (e) {
        e.preventDefault();
        enableModal();
        sendRegisterRequest();
        disableModal();
    });
}

function renderConfirmDeleteDialog(deck_id, msg) {
    let confirmDeleteDialog = document.getElementById("confirm-delete-dialog");
    confirmDeleteDialog.showModal();

    dialogTemplate = `
    <h2>${msg}</h2>
    <div>
        <button id="close-dialog">back</button><button id="confirm-dialog">
            confirm
        </button>
    </div>`;

    confirmDeleteDialog.innerHTML = dialogTemplate;
    let closeDialog = document.getElementById("close-dialog");
    closeDialog.addEventListener("click", function(e) {
        e.preventDefault();
        confirmDeleteDialog.close();
    });

    let confirmDialog = document.getElementById("confirm-dialog");
    confirmDialog.addEventListener("click", async function(e) {
        e.preventDefault();
        enableModal();
        await deleteDeck(deck_id);
        disableModal();
        confirmDeleteDialog.close();
        loadHomePage();
    });
}

function createDeckContainer(deckData) {
    let deckName = deckData.name;
    let deckId = deckData._id;

    let deckContainerTemplate = `
        <div class="deck">
            <div class="deck-top clickable">
                <p>${deckName}</p>
                <span class="material-symbols-outlined size-48" style="font-size:48px;">play_arrow</span>
            </div>
            <div class="deck-bottom">
                <div class="delete clickable">
                    <div><span class="material-symbols-outlined size-48" style="font-size:36px;">delete</span></div>
                    <div>delete<br>deck</div>
                </div>
                <div class="list clickable">
                    <div><span class="material-symbols-outlined size-48" style="font-size:36px;">list</span></div>
                    <div>list<br>view</div>
                </div>
                <div class="add-card clickable">
                    <div><span class="material-symbols-outlined size-48" style="font-size:36px;">add</span></div>
                    <div>add<br>cards</div>
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
    deleteDiv.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("dd")
        renderConfirmDeleteDialog(deckId, "Confirm delete deck");
    });

    let listDiv = deckContainer.getElementsByClassName("list")[0];
    listDiv.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("clicking list-view")
        loadListView(deckId);
    });

    let addCardDiv = deckContainer.getElementsByClassName("add-card")[0];
    addCardDiv.addEventListener("click", function (e) {
        e.preventDefault();
        renderCreateCardForm(deckId, loadHomePage);
    });

    return deckContainer
}

function createCreateDeckContainer() {
    let createDeckTemplate = `
    <div class="deck new-deck">
        <div class="add-new-deck clickable">
            <div><span class="material-symbols-outlined size-48" style="font-size:48px;">add</span></div>
            <div>Add new deck</div>
        </div>
    </div>`;

    let deckContainer = document.createElement("div");
    deckContainer.setAttribute("class", "deck-container");
    deckContainer.innerHTML = createDeckTemplate;

    let createDeckDiv = deckContainer.getElementsByClassName("add-new-deck")[0];
    createDeckDiv.addEventListener("click", function (e) {
        console.log("clicked add new deck");
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
    console.log(decks);

    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    let backButton = document.createElement("button");
    backButton.setAttribute("type", "button");
    backButton.innerHTML = "go back";
    backButton.addEventListener("click", async function (e) {
        e.preventDefault();
        loadHomePage();
    });

    const createDeckForm = document.createElement("form");
    createDeckForm.setAttribute("id", "create-deck-form");

    const deckNameField = document.createElement("input");
    deckNameField.setAttribute("type", "text");
    deckNameField.setAttribute("name", "name");
    deckNameField.setAttribute("id", "deck-name-field");
    deckNameField.setAttribute("class", "create-deck-form-field");
    deckNameField.setAttribute("placeholder", "Deck name");

    const submitButton = document.createElement("input");
    submitButton.setAttribute("type", "submit");
    submitButton.setAttribute("value", "Create new deck");
    submitButton.setAttribute("id", "create-new-deck-form-submit");

    createDeckForm.appendChild(deckNameField);
    createDeckForm.appendChild(submitButton);
    createDeckForm.addEventListener("submit", function (e) {
        e.preventDefault();
        sendCreateDeckRequest();
    });

    appContainer.appendChild(backButton);
    appContainer.appendChild(createDeckForm);
}

function renderCreateCardForm(deck_id, callback) {
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    let backButton = document.createElement("button");
    backButton.setAttribute("type", "button");
    backButton.innerHTML = "go back";
    backButton.addEventListener("click", async function (e) {
        e.preventDefault();
        callback();
    });

    const createCardForm = document.createElement("form");
    createCardForm.setAttribute("id", "create-card-form");

    const cardQuestionField = document.createElement("input");
    cardQuestionField.setAttribute("type", "text");
    cardQuestionField.setAttribute("name", "question");
    cardQuestionField.setAttribute("id", "card-question-field");
    cardQuestionField.setAttribute("placeholder", "question");

    const cardAnswerField = document.createElement("input");
    cardAnswerField.setAttribute("type", "text");
    cardAnswerField.setAttribute("name", "answer");
    cardAnswerField.setAttribute("id", "card-answer-field");
    cardAnswerField.setAttribute("placeholder", "answer");

    const submitButton = document.createElement("input");
    submitButton.setAttribute("type", "submit");
    submitButton.setAttribute("value", "Create new card");
    submitButton.setAttribute("id", "create-new-card-form-submit");

    createCardForm.appendChild(cardQuestionField);
    createCardForm.appendChild(cardAnswerField);
    createCardForm.appendChild(submitButton);
    createCardForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        enableModal();
        await sendCreateCardRequest(deck_id);
        disableModal();
        cardQuestionField.value = "";
        cardAnswerField.value = "";
    });

    appContainer.appendChild(backButton);
    appContainer.appendChild(createCardForm);
}

function eta(date) {
    return "now"
}

function renderListView(deckData) {
    appContainer.innerHTML = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">arrow_back_ios_new</span>
            </div>
            <div>
                <p>go back</p>
            </div>
        </div>
        <div id="add-new-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">add</span>
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
        console.log(deckData);
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
			<div class="table-cell small">${eta(card.date)}</div>
            <div style="display: flex;">
                <div class="clickable">
                    <span class="material-symbols-outlined size-48" style="font-size:24px;">edit</span>
                </div>
                <div class="clickable">
                    <span class="material-symbols-outlined size-48" style="font-size:24px;">delete</span>
                </div>
            </div>`;
        row.innerHTML = cells;
        table.appendChild(row);
        // console.log(temp.firstChild);
    }
    appContainer.appendChild(table);
    // table = document.createElement("div");
    // table.setAttribute("class", "empty");
    // appContainer.appendChild(table);
}

// ================ CARD LEARNING ================

function renderEditCardView(currentDeck) {
    let currentCard = currentDeck.getTopCard();
    let oldQuestion = currentCard.question;
    let oldAnswer = currentCard.answer;
    let editCardView = `
    <form id="edit-card-form">
        <input type="text" name="question" id="card-question-field" placeholder="question" value="${oldQuestion}">
        <input type="text" name="answer" id="card-answer-field" placeholder="answer" value="${oldAnswer}">
        <input type="submit" value="Edit card" id="edit-card-form-submit">
    </form>`;

    appContainer.innerHTML = editCardView;
    let form = document.getElementById("edit-card-form")
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        let newQuestion = document.getElementById("card-question-field").value;
        let newAnswer = document.getElementById("card-answer-field").value;

        // enableModal();
        // await sendCreateCardRequest(deck_id);
        // disableModal();
        currentCard.question = newQuestion;
        currentCard.answer = newAnswer;
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
    console.log("disabling buttons");
    let showAnswer = document.getElementById("show-answer");
    console.log(showAnswer);
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
        var currentCard = createCardDiv("<h1>🤓</h1>", "No cards left to study!", true);
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
    // let editCardButton = document.getElementById("edit-card");
    // editCardButton.addEventListener("click", function(e) {
        
    // });
}

function renderCardsLearningPage(currentDeck) {
    let appContainer = document.getElementById("app-container");
    let cardsLearningPageTemplate = `
    <div id="controls">
        <div id="back" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">arrow_back_ios_new</span>
            </div>
            <div>
                <p>sync and go back</p>
            </div>
        </div>
        <div id="edit-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">edit</span>
            </div>
            <div>
                <p>edit card</p>
            </div>
        </div>
        <div id="add-new-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">add</span>
            </div>
            <div>
                <p>add new card</p>
            </div>
        </div>
        <div id="remove-card" class="clickable">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">delete</span>
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
                <span class="material-symbols-outlined size-48" style="font-size:36px;">visibility</span>
            </div>
            <div>
                <p class="learning-button">show answer</p>
            </div>
        </div>
        <div id="wrong-answer" class="clickable" style="display: none;">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">close</span>
            </div>
            <div>
                <p class="learning-button">wrong answer</p>
            </div>
        </div>
        <div id="correct-answer" class="clickable" style="display: none;">
            <div>
                <span class="material-symbols-outlined size-48" style="font-size:36px;">check</span>
            </div>
            <div>
                <p class="learning-button" id="correct-button-text"></p>
            </div>
        </div>
    </div>`;
    appContainer.innerHTML = cardsLearningPageTemplate;

    let backButton = document.getElementById("back");
    backButton.addEventListener("click", function(e) {
            loadHomePage();
    });

    let editCardButton = document.getElementById("edit-card");
    editCardButton.addEventListener("click", function(e) {
        if (!currentDeck.isQueueEmpty()) {
            console.log(currentDeck.getTopCard());
            renderEditCardView(currentDeck);
        }
    });

    let addNewCardButton = document.getElementById("add-new-card");
    addNewCardButton.addEventListener("click", function(e) {
            console.log("dd");
            const callback = function() { return loadCardsLearningPage(currentDeck.deck._id); };
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
    turnOffDarkMode();
    let themeControlDiv = document.getElementById("theme-control");
    let newThemeControlDiv = document.createElement("div");
    newThemeControlDiv.setAttribute("id", "theme-control");
    newThemeControlDiv.setAttribute("class", "clickable");
    newThemeControlDiv.innerHTML = `
        <div>
            <span class="material-symbols-outlined size-48" style="font-size:36px;">dark_mode</span>
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
    turnOnDarkMode();
    let themeControlDiv = document.getElementById("theme-control");
    let newThemeControlDiv = document.createElement("div");
    newThemeControlDiv.setAttribute("id", "theme-control");
    newThemeControlDiv.setAttribute("class", "clickable");
    newThemeControlDiv.innerHTML = `
        <div>
            <span class="material-symbols-outlined size-48" style="font-size:36px;">light_mode</span>
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
            <span class="material-symbols-outlined size-48" style="font-size:36px;">${symbolName}</span>
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

const login = async () => {
    console.log("login");
    loadLoginPage();
}

const register = () => {
    console.log("register");
    loadRegisterPage();
}

const logout = async () => {
    console.log("logout");
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


async function loadHomePage() {
    console.log("attempting to load decks");
    createUserControlButton("logout", logout);
    enableModal();
    decks = await getUserDecks();
    disableModal();
    if (decks) {
        renderDecks(decks);
    }
}

function loadLoginPage() {
    // enableModal();
    console.log("attempting to load login page");
    createUserControlButton("register", register);
    createLoginForm();
    // disableModal();
}

function loadRegisterPage() {
    // enableModal();
    console.log("attempting to load login page");
    createUserControlButton("login", login);
    createRegisterForm();
    // disableModal();
}

async function loadCardsLearningPage(deck_id) {
    enableModal();
    let deckData = await getDeck(deck_id);
    disableModal();
    let currentDeck = new CurrentDeck(deckData);
    console.log(JSON.stringify(currentDeck));
    renderCardsLearningPage(currentDeck);
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

var appContainer = document.getElementById("app-container");
let rootUrl = "http://127.0.0.1:8000/";
var decks = undefined;

loadDarkThemeButton();
loadHomePage();
