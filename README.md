# Manki

## What is it?

It's a single page application with flashcards with Spaced Repetition System (SRS). Similar to popular language learning app Anki, which is very customizable but runs only locally utilizing SQL database.

Deployed on Heroku: [manki.herokuapp.com](https://manki.herokuapp.com/)

## How to use it?

Create new decks, create new cards, edit them and delete them and above all, learn them. SRS algorithm role is to show you new and difficult to learn cards frequently, and gradually as you assimilate the contents of the card, show it less and less frequent.

![Manki Diagram](img/dark-no-bg.png#gh-dark-mode-only)
![Manki Diagram](img/light-no-bg.png#gh-light-mode-only)

## How I built it?

I made it with FastAPI and MongoDB on the backend. Authentication with JWT tokens. Each user is a single document with decks as embedded documents, and cards as documents embedded inside decks (I'm still unsure about this architecture).

```
{
    _id: "id",
    username: "str",
    hashed_password: "str",
    decks: [
      {
        _id: "id",
        name: "str",
        cards: [
          {
            _id: "id",
            question: "str",
            answer: "str",
            date: "str",
            last_was_wrong: "bool",
            last_interval: "int"
          },
          ...
        ]
      },
      ...
    ]
  },
```

Frontend is a vanilla JS updating DOM to achieve better performance and rosponsivity than requesting HTML files after each action.

## Screenshots

![image](https://github.com/Pawix5k/Manki/assets/35242389/3731c5ce-7038-4806-8c6c-7e4c18706c3a)

![image](https://github.com/Pawix5k/Manki/assets/35242389/ebe3faa1-1bfa-433e-add7-6a7dbc314288)

![image](https://github.com/Pawix5k/Manki/assets/35242389/2ce43409-4717-4d20-8071-17d58cde6fcd)

![image](https://github.com/Pawix5k/Manki/assets/35242389/6b7b4932-4165-432c-828e-b139f935e717)

![image](https://github.com/Pawix5k/Manki/assets/35242389/950f1e5d-abd6-4455-a73e-f6f953fe855f)
