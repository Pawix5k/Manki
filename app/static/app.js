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

function renderDecks(decks) {
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

    for (const [deck_id, deck] of Object.entries(decks)) {
        const deckDiv = document.createElement("div");
        const deckDescription = document.createElement("p");
        deckDescription.innerHTML = deck.name;
        deckDescription.style.fontWeight = "bold";
        deckDescription.addEventListener("click", function (e) {
            e.preventDefault();
            console.log("clicked " + deck_id);
            loadCardsLearningPage(deck_id);
        });
        deckDiv.appendChild(deckDescription);
        appContainer.appendChild(deckDiv);
    }

    const newDeckButton = document.createElement("button");
    newDeckButton.setAttribute("id", "add-new-card");
    newDeckButton.innerHTML = "Add new deck";
    newDeckButton.addEventListener("click", function (e) {
        console.log("clicked add new deck");
        e.preventDefault();
        renderCreateDeckForm();
    });
    appContainer.appendChild(newDeckButton);
}

function renderCreateDeckForm() {
    console.log(decks);

    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";

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

    appContainer.appendChild(createDeckForm);
}

// function renderCardDetail(cardDetail) {
//     console.log(cardDetail);
//     let cardDiv = document.createElement("div");
//     cardDiv.setAttribute("id", "card-detail");
    
//     let questionParagraph = document.createElement("p");
//     questionParagraph.innerHTML = "question: " + cardDetail.question;

//     let answerParagraph = document.createElement("p");
//     answerParagraph.innerHTML = "answer: " + cardDetail.answer;

//     cardDiv.appendChild(questionParagraph);
//     cardDiv.appendChild(answerParagraph);

//     return cardDiv
// }

function renderCardsLearningPage(currentDeck) {
    const appContainer = document.getElementById("app-container");
    appContainer.innerHTML = "";
    let backButton = document.createElement("button");
    backButton.setAttribute("type", "button");
    backButton.innerHTML = "go back";
    backButton.addEventListener("click", function (e) {
        e.preventDefault();
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
    if (decks === undefined) {
        decks = await getUserDecks();
    }
    if (decks) {
        renderDecks(decks);
    }
}

function loadLoginPage() {
    console.log("attempting to load login page");
    createLoginForm();
}

async function loadCardsLearningPage(deck_id) {
    let deckData = await getDeck(deck_id);
    let currentDeck = new CurrentDeck(deckData);
    console.log(JSON.stringify(currentDeck));
    renderCardsLearningPage(currentDeck);
}

let appContainer = document.getElementById("app-container");
let rootUrl = "http://127.0.0.1:8000/";
var decks = undefined;

loadHomePage();
