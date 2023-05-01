let appContainer = document.getElementById("app-container");
console.log(appContainer);
let rootUrl = "http://127.0.0.1:8000/";


async function get_user_decks() {
    let response = await fetch(rootUrl + "decks");
    if (response.status !== 200) {
        load_login_page();
    }
    else {
        let data2 = await response.json();
        return data2
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
            console.log(response.status);
            if (response.status !== 200) {
                console.log(
                    'Looks like there was a problem. Status Code: ' + response.status
                );
                load_login_page();
            }
            response.json()
                .then(function (data) {
                    console.log(data);
                    load_home_page();
            });
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}

function create_login_form() {
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

    decks.forEach(element => {
        console.log("smth");
        const deckDiv = document.createElement("div");
        deckDiv.innerHTML = element.name + ", " + element.cards.length + " cards";
        appContainer.appendChild(deckDiv);
    });

}
async function load_home_page() {
    console.log("attempting to load decks");
    let decks = await get_user_decks();
    console.log(decks);
    if (decks) {
        renderDecks(decks);
    }
}

function load_login_page() {
    console.log("attempting to load login page");
    create_login_form();
}

load_home_page();
