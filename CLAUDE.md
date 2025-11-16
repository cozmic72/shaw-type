# Shaw Type

## Project description
This project is a typing practice tool for the shavian alphabet.  It supports several different keyboard layouts,
and two different dialects of english.  It has two modes: play and practice.  Two other main features worth mentioning
here are:
1. The ability to switch the UI to a Shavian transliterated version
2. The tool supports dynamic forming of ligatures: typing 𐑩 then 𐑮 forms "𐑼", for example

## Tools
We generate the game levels and practice lessons using the python scripts 
`generate_learn_words.py` and `generrate_play_words.py`.

For a rapid iteration cycle, it is useful to run a python webserver listening on port 8000 so the user can test the
changes easily.  If there is already a process listening on that port, you can kill it - it will invariably be 
from a previous session.

## General instructions
- Commit often.
- Keep the code clean and structured.
- Refactor code before adding new functionality if it will make the change easier.
- Avoid using too many tokens!  Do not read entire files without conferring with the user.  Be smart: use grep or 
  write ad hoc scripts if needed.
- Important: Always ask the user to run the regeneration tools!   Not doing so corrupts the context!