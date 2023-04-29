var loginButton = document.getElementById('login-form-submit');
// loginButton.addEventListener('click', fetchData);

document.addEventListener("DOMContentLoaded", (event) => {
    document.getElementById("login-form").addEventListener("submit", function (e) {
        e.preventDefault(); // Cancel the default action
        fetchData();
    });
});

function fetchData() {
    var formElement = document.getElementById('login-form');
    var data = new FormData(formElement);
    var req = {
        method: "POST",
        // headers: {
        //     "username": username,
        //     "password": password,
        // },
        body: data,
    }
    fetch('http://127.0.0.1:8000/token', req)
        .then(function (response) {
        if (response.status !== 200) {
            console.log(
            'Looks like there was a problem. Status Code: ' + response.status
            );
            return;
        }
        response.json().then(function (data) {
            console.log(data);
            document.getElementById('token-received').innerHTML = JSON.stringify(data);
        });
        })
        .catch(function (err) {
        console.log('Fetch Error :-S', err);
        });
    }

// function redirect_to_app() {
//     fetch('http://127.0.0.1:8000/users/me', req)
//         .then(function (response) {
//         if (response.status !== 200) {
//             console.log(
//             'Looks like there was a problem. Status Code: ' + response.status
//             );
//             return;
//         }
//         response.json().then(function (data) {
//             console.log(data);
//             document.getElementById('token-received').innerHTML = JSON.stringify(data);
//         });
//         })
//         .catch(function (err) {
//         console.log('Fetch Error :-S', err);
//         });
//     }
// }