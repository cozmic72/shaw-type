# Shaw Type

## Project description
This project is a typing practice tool for the shavian alphabet.  It supports several different keyboard layouts,
and two different dialects of english.  It has two modes: play and practice.  Two other main features worth mentioning
here are:
1. The ability to switch the UI to a Shavian transliterated version
2. The tool supports dynamic forming of ligatures: typing 𐑩 then 𐑮 forms "𐑼", for example

## Tools

### Word Generation
We generate the game levels and practice lessons using the python scripts
`generate_learn_words.py` and `generrate_play_words.py`.

### Build Process
To build all resources for a new version:
```bash
./build.sh <version>
```
Example: `./build.sh 2.0-beta-5`

This script:
1. Deploys `index.html` with the version number (from template)
2. Generates keyboard images
3. Generates transliterations for content pages
4. Generates word lists
5. Generates favicon

### Manual Deployment
To deploy index.html without running the full build:
```bash
python3 tools/deploy.py <version>
```
Example: `python3 tools/deploy.py 2.0-beta-5`

This script:
- Reads `sources/index.html.template`
- Replaces `{{VERSION}}` placeholders with the actual version
- Writes the result to `site/index.html`

**Important**: Never edit `site/index.html` directly! Edit `sources/index.html.template` instead.

### Development Server
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
- Don't run any build scripts, leave that up to the user
- Only commit changes after the user has rebuilt and validated your change.  Include any files changed by the build process in the commit.
- Important: all html source files are in the `content` directory. When you need to edit a html file edit them there!  The build script will overwrite the ones in site.