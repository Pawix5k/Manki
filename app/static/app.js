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

        return this.intervals[index] + " days"
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
    // data = await response.json();
    // let newDecks = {}
    // data.decks.forEach(deck => {
    //     newDecks[deck._id] = deck;
    // });
    // decks = newDecks;
    // console.log(data);
    // loadHomePage();
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
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    const loginForm = document.createElement("form");
    loginForm.setAttribute("id", "login-form");

    const usernameField = document.createElement("input");
    usernameField.setAttribute("type", "text");
    usernameField.setAttribute("name", "username");
    usernameField.setAttribute("id", "username-field");
    usernameField.setAttribute("class", "login-form-field");
    usernameField.setAttribute("placeholder", "Username");

    const passwordField = document.createElement("input");
    passwordField.setAttribute("type", "password");
    passwordField.setAttribute("name", "password");
    passwordField.setAttribute("id", "password-field");
    passwordField.setAttribute("class", "login-form-field");
    passwordField.setAttribute("placeholder", "Password");

    const submitButton = document.createElement("input");
    submitButton.setAttribute("type", "submit");
    submitButton.setAttribute("value", "Login");
    submitButton.setAttribute("id", "login-form-submit");

    loginForm.appendChild(usernameField);
    loginForm.appendChild(passwordField);
    loginForm.appendChild(submitButton);
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        sendLoginRequest();
    });

    appContainer.appendChild(loginForm);
}

function renderConfirmDeleteDialog(deck_id, msg) {
    let dialog = document.getElementById("confirm-delete-dialog");
    dialog.showModal();

    let confirmDeleteDialog = document.getElementById("confirm-delete-dialog");
    confirmDeleteDialog.innerHTML = "";

    let header = document.createElement("h2");
    header.innerHTML = msg;

    let buttonsDiv = document.createElement("div");

    let closeDialogButton = document.createElement("button");
    closeDialogButton.setAttribute("id", "close-dialog");
    closeDialogButton.innerHTML = "back";

    let confirmDialogButton = document.createElement("button");
    confirmDialogButton.setAttribute("id", "confirm-dialog");
    confirmDialogButton.innerHTML = "confirm";

    closeDialogButton.addEventListener("click", function(e) {
        console.log("BACK");
        e.preventDefault();
        // let dialog = document.getElementById("confirm-delete-dialog");
        dialog.close();
    });
    confirmDialogButton.addEventListener("click", async function(e) {
        console.log("CONFIRM");
        e.preventDefault();
        enableModal();
        await deleteDeck(deck_id);
        disableModal();
        dialog.close();
        loadHomePage();
    });

    buttonsDiv.appendChild(closeDialogButton);
    buttonsDiv.appendChild(confirmDialogButton);

    confirmDeleteDialog.appendChild(header);
    confirmDeleteDialog.appendChild(buttonsDiv);
}

function createDeckDiv(symbol, text) {
    let div = document.createElement("div");
    let iconDiv = document.createElement("div");
    let span = document.createElement("span");
    span.setAttribute("class", "material-symbols-outlined size-48");
    span.setAttribute("style", "font-size:36px;");
    span.innerHTML = symbol
    let textDiv = document.createElement("div");
    textDiv.innerHTML = text;
    iconDiv.appendChild(span);
    div.appendChild(iconDiv);
    div.appendChild(textDiv);
    
    return div
}

function createDeckContainer(deckData) {
    let deckName = deckData.name;
    let deckId = deckData._id;

    let deckContainerTemplate = `
        <div class="deck">
            <div class="deck-top clickable">
                <p>${deckName}</p>
            </div>
            <div class="deck-bottom">
                <div class="delete clickable">
                    <div><span class="material-symbols-outlined size-48" style="font-size:36px;">delete</span></div>
                    <div>delete<br>deck</div>
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

    let addCardDiv = deckContainer.getElementsByClassName("add-card")[0];
    addCardDiv.addEventListener("click", function (e) {
        e.preventDefault();
        renderCreateCardForm(deckId);
    });

    return deckContainer
}

function createCreateDeckContainer() {
    let deckContainer = document.createElement("div");
    deckContainer.setAttribute("class", "deck-container");

    let deck = document.createElement("div");
    deck.setAttribute("class", "deck new-deck");

    let addNewDeckDiv = document.createElement("div");
    addNewDeckDiv.setAttribute("class", "add-new-deck clickable");

    let iconDiv = document.createElement("div");
    let span = document.createElement("span");
    span.setAttribute("class", "material-symbols-outlined size-48");
    span.setAttribute("style", "font-size:48px;");
    span.innerHTML = "add";
    let textDiv = document.createElement("div");
    textDiv.innerHTML = "Add new deck";
    iconDiv.appendChild(span);
    addNewDeckDiv.appendChild(iconDiv);
    addNewDeckDiv.appendChild(textDiv);
    addNewDeckDiv.addEventListener("click", function (e) {
        console.log("clicked add new deck");
        e.preventDefault();
        renderCreateDeckForm();
    });

    deck.appendChild(addNewDeckDiv);

    deckContainer.appendChild(deck);

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

function renderCreateCardForm(deck_id) {
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    let backButton = document.createElement("button");
    backButton.setAttribute("type", "button");
    backButton.innerHTML = "go back";
    backButton.addEventListener("click", async function (e) {
        e.preventDefault();
        loadHomePage();
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

function renderCardsLearningPage(currentDeck) {
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";
    let backButton = document.createElement("button");
    backButton.setAttribute("type", "button");
    backButton.innerHTML = "go back";
    backButton.addEventListener("click", async function (e) {
        console.log(currentDeck.updates);
        console.log(currentDeck.buildDeckUpdateRequestBody());
        e.preventDefault();
        if (!currentDeck.isUpdatesEmpty()) {
            await sendDeckUpdates(currentDeck.buildDeckUpdateRequestBody());
        }
        loadHomePage();
    });

    let cardsInterface = document.createElement("div");
    cardsInterface.setAttribute("id", "cards-interface");

    appContainer.appendChild(backButton);
    appContainer.appendChild(cardsInterface);



    if (currentDeck.isQueueEmpty()) {
        cardsInterface.innerHTML = "";
        let cardDiv = document.createElement("div");
        cardDiv.innerHTML = "No cards to learn today!";

        cardsInterface.appendChild(cardDiv);
    }
    else {
        cardsInterface.innerHTML = "";

        let topCard = currentDeck.getTopCard();
        let question = topCard.question;
        let answer = topCard.answer;
        let intervalTime = currentDeck.getNextCardsInterval();

        let questionParagraph = document.createElement("p");
        questionParagraph.innerHTML = "question: " + question;
        questionParagraph.setAttribute("id", "question");

        let answerParagraph = document.createElement("p");
        answerParagraph.innerHTML = "answer: " + answer;
        answerParagraph.setAttribute("id", "answer");
        answerParagraph.style.visibility = "hidden";

        let showButton = document.createElement("button");
        showButton.setAttribute("type", "button");
        showButton.setAttribute("id", "show-button");
        showButton.innerHTML = "show";
        showButton.addEventListener("click", function (e) {
            e.preventDefault();
            this.style.visibility = "hidden";
            document.getElementById("wrong-button").style.visibility = "visible";
            document.getElementById("correct-button").style.visibility = "visible";
            answerParagraph.style.visibility = "visible";
        });

        let wrongButton = document.createElement("button");
        wrongButton.setAttribute("type", "button");
        wrongButton.setAttribute("id", "wrong-button");
        wrongButton.style.visibility = "hidden";
        wrongButton.innerHTML = "wrong";
        wrongButton.addEventListener("click", function (e) {
            e.preventDefault();
            currentDeck.wrongAnswer();
            renderCardsLearningPage(currentDeck);
        });
        
        let correctButton = document.createElement("button");
        correctButton.setAttribute("type", "button");
        correctButton.setAttribute("id", "correct-button");
        correctButton.style.visibility = "hidden";
        correctButton.innerHTML = "correct (" + intervalTime + ")";
        correctButton.addEventListener("click", function (e) {
            e.preventDefault();
            currentDeck.correctAnswer();
            renderCardsLearningPage(currentDeck);
        });
        
        appContainer.appendChild(questionParagraph);
        appContainer.appendChild(answerParagraph);
        appContainer.appendChild(showButton);
        appContainer.appendChild(wrongButton);
        appContainer.appendChild(correctButton);
    }
}

async function loadHomePage() {
    console.log("attempting to load decks");
    enableModal();
    decks = await getUserDecks();
    disableModal();
    if (decks) {
        renderDecks(decks);
    }
}

function loadLoginPage() {
    enableModal();
    console.log("attempting to load login page");
    createLoginForm();
    disableModal();
}

async function loadCardsLearningPage(deck_id) {
    enableModal();
    let deckData = await getDeck(deck_id);
    disableModal();
    let currentDeck = new CurrentDeck(deckData);
    console.log(JSON.stringify(currentDeck));
    renderCardsLearningPage(currentDeck);
}

// var modal = document.getElementById("modal");

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

// const openDialog = () => {
//     dialog.showModal();
//   };
  
// const closeDialog = (e) => {
//     e.preventDefault();
//     dialog.close();
// };
// const openDialogBtn = document.getElementById("close_dialog");
// const closeDialogBtn = document.getElementById("confirm_dialog");
// openDialogBtn.addEventListener("click", openDialog);
// closeDialogBtn.addEventListener("click", closeDialog);
// const dialog = document.querySelector("dialog");
// dialog.showModal();
// enableModal();


let appContainer = document.getElementById("app-container");
let rootUrl = "http://127.0.0.1:8000/";
var decks = undefined;

loadHomePage();
