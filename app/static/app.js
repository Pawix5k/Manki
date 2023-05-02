let appContainer = document.getElementById("app-container");
let rootUrl = "http://127.0.0.1:8000/";
var decks = undefined;


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

    // decks.forEach(element => {
    //     const deckDiv = document.createElement("div");
    //     deckDiv.innerHTML = element.name + ", " + element.cards.length + " cards";
    //     appContainer.appendChild(deckDiv);
    // });

    for (const [deck_id, deck] of Object.entries(decks)) {
        const deckDiv = document.createElement("div");
        deckDiv.innerHTML = deck.name + ", " + deck.cards.length + " cards";
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

loadHomePage();
