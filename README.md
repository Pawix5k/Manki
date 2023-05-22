# Manki

## What is it?

It's a single page application with flashcards with Spaced Repetition System (SRS). Similar to popular language learning app Anki, which is very customizable but runs only locally utilizing SQL database.

## How to use it?

Create new decks, create new cards, edit them and delete them and above all, learn them. SRS algorithm role is to show you new and difficult to learn cards frequently, and gradually as you assimilate the contents of the card, show it less and less frequent.

![Manki Diagram](img/dark-no-bg.png#gh-dark-mode-only)
![Manki Diagram](img/light-no-bg.png#gh-light-mode-only)

## How I built it?

I made it with FastAPI and MongoDB on the backend. Each user is a single document with decks as embedded documents, and cards as documents embedded inside decks (I'm still unsure about this architecture).

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
