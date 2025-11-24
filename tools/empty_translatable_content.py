#!/usr/bin/env python3
"""
Empty translatable text content from index.html since it gets filled from translation files.
"""

from pathlib import Path
import re

def empty_translatable_content():
    """Empty text content from elements that get translated."""
    project_root = Path(__file__).parent.parent
    source_file = project_root / 'content' / 'index.html'

    with open(source_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Elements to empty (button text, labels, etc.)
    # These get their content set by JavaScript from translation files
    replacements = [
        # Main title and subtitle
        (r'<h1 id="mainTitle">Shaw Type</h1>', r'<h1 id="mainTitle"></h1>'),
        (r'<div class="subtitle" id="mainSubtitle">𐑖𐑱𐑝𐑾𐑯 𐑑𐑲𐑐𐑦𐑙 𐑐𐑮𐑨𐑒𐑑𐑦𐑕</div>', r'<div class="subtitle" id="mainSubtitle"></div>'),

        # Home buttons
        (r'<button class="home-btn" id="homePlayBtn" onclick="startPlay\(\)">Play</button>',
         r'<button class="home-btn" id="homePlayBtn" onclick="startPlay()"></button>'),
        (r'<button class="home-btn" id="homePracticeBtn" onclick="startPractice\(\)">Practice</button>',
         r'<button class="home-btn" id="homePracticeBtn" onclick="startPractice()"></button>'),
        (r'<button class="home-btn" id="homeSettingsBtn" onclick="openSettings\(\)">Settings</button>',
         r'<button class="home-btn" id="homeSettingsBtn" onclick="openSettings()"></button>'),

        # Menu items
        (r'<a id="menuAbout" href="#" onclick="openContentModal\(\'about\'\); return false;">About</a>',
         r'<a id="menuAbout" href="#" onclick="openContentModal(\'about\'); return false;"></a>'),
        (r'<a id="menuKeyboards" href="#" onclick="openContentModal\(\'keyboards\'\); return false;">Keyboards</a>',
         r'<a id="menuKeyboards" href="#" onclick="openContentModal(\'keyboards\'); return false;"></a>'),
        (r'<a id="menuResources" href="#" onclick="openContentModal\(\'resources\'\); return false;">Resources</a>',
         r'<a id="menuResources" href="#" onclick="openContentModal(\'resources\'); return false;"></a>'),
        (r'<a id="menuHighScores" href="#" onclick="openHighScores\(\); closeBurgerMenu\(\); return false;">Scores</a>',
         r'<a id="menuHighScores" href="#" onclick="openHighScores(); closeBurgerMenu(); return false;"></a>'),
        (r'<a id="menuSettings" href="#" onclick="openSettings\(\); closeBurgerMenu\(\); return false;">Settings</a>',
         r'<a id="menuSettings" href="#" onclick="openSettings(); closeBurgerMenu(); return false;"></a>'),

        # Stats labels
        (r'<div class="stat-label" id="levelLabel">Level</div>',
         r'<div class="stat-label" id="levelLabel"></div>'),
        (r'<div class="stat-label">Words</div>',
         r'<div class="stat-label" id="wordsLabel"></div>'),
        (r'<div class="stat-label">Accuracy</div>',
         r'<div class="stat-label" id="accuracyLabel"></div>'),

        # Completion modal
        (r'<h2 id="completionTitle">Congratulations!</h2>',
         r'<h2 id="completionTitle"></h2>'),
        (r'<button onclick="resetPractice\(\)">Practice Again</button>',
         r'<button id="practiceAgainBtn" onclick="resetPractice()"></button>'),

        # High scores modal
        (r'<h2 id="highScoresTitle">Scores</h2>',
         r'<h2 id="highScoresTitle"></h2>'),
        (r'<button class="home-btn" id="highScoresCloseBtn" onclick="closeHighScores\(\)"[^>]*>Close</button>',
         r'<button class="home-btn" id="highScoresCloseBtn" onclick="closeHighScores()" style="padding: 12px 40px; font-size: 16px;"></button>'),

        # Settings modal
        (r'<h2>Settings</h2>',
         r'<h2 id="settingsTitle"></h2>'),
        (r'<label id="settingsDialectLabel"[^>]*>\s*Choose spelling\s*</label>',
         r'<label id="settingsDialectLabel" style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;"></label>'),
        (r'<span id="settingsDialectBritish">British</span>',
         r'<span id="settingsDialectBritish"></span>'),
        (r'<span id="settingsDialectAmerican">American</span>',
         r'<span id="settingsDialectAmerican"></span>'),
        (r'<label style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;" id="settingsKeyboardLayoutLabel">\s*Keyboard Layout\s*</label>',
         r'<label style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;" id="settingsKeyboardLayoutLabel"></label>'),
        (r'<span id="ligatureLabel">Automatic ligatures \(𐑩\+𐑮→𐑼, 𐑘\+𐑵→𐑿\)</span>',
         r'<span id="ligatureLabel"></span>'),
        (r'<span id="settingsVirtualKeyboard">Show virtual keyboard</span>',
         r'<span id="settingsVirtualKeyboard"></span>'),
        (r'<span>Display UI in Shavian</span>',
         r'<span id="settingsShavianUILabel"></span>'),
        (r'<label style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;" id="settingsLevelCountLabel">\s*Play Mode Level Count\s*</label>',
         r'<label style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;" id="settingsLevelCountLabel"></label>'),

        # Setup modal
        (r'<h2 id="setupTitle">Get Started</h2>',
         r'<h2 id="setupTitle"></h2>'),
        (r'<p id="setupSubtitle"[^>]*>Choose your keyboard layout and spelling preference:</p>',
         r'<p id="setupSubtitle" style="margin: 15px 0; color: #666;"></p>'),
        (r'<label id="setupKeyboardLayoutLabel"[^>]*>\s*Keyboard Layout\s*</label>',
         r'<label id="setupKeyboardLayoutLabel" style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;"></label>'),
        (r'<label id="setupDialectLabel"[^>]*>\s*Choose spelling\s*</label>',
         r'<label id="setupDialectLabel" style="display: block; margin-bottom: 10px; color: #666; font-weight: normal;"></label>'),
        (r'<span id="setupDialectBritish">British</span>',
         r'<span id="setupDialectBritish"></span>'),
        (r'<span id="setupDialectAmerican">American</span>',
         r'<span id="setupDialectAmerican"></span>'),
        (r'<span id="setupVirtualKeyboard">Show virtual keyboard</span>',
         r'<span id="setupVirtualKeyboard"></span>'),
        (r'<p id="setupNote"[^>]*>Don\'t worry too much\. This choice, and more besides, can be changed later in settings\.</p>',
         r'<p id="setupNote" style="margin: 20px 0; color: #999; font-size: 14px; font-style: italic;"></p>'),
        (r'<button id="setupStartBtn"[^>]*>Start Practicing!</button>',
         r'<button id="setupStartBtn" class="settings-close-btn" onclick="closeSetupModal()" style="margin-top: 15px; width: 100%;"></button>'),

        # Lesson modal
        (r'<h2 id="lessonModalTitle">Choose a Lesson</h2>',
         r'<h2 id="lessonModalTitle"></h2>'),
        (r'<p id="lessonModalSubtitle"[^>]*>Select a lesson to practice:</p>',
         r'<p id="lessonModalSubtitle" style="margin: 15px 0; color: #666;"></p>'),

        # Splash modal
        (r'<button id="splashContinueBtn"[^>]*>Continue</button>',
         r'<button id="splashContinueBtn" class="settings-close-btn" onclick="closeSplashModal()" style="margin-top: 15px; width: 100%;"></button>'),
        (r'<span id="splashDontShowAgain"[^>]*>Don\'t show this again</span>',
         r'<span id="splashDontShowAgain" style="color: #666; font-size: 14px;"></span>'),
    ]

    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    with open(source_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Emptied translatable content in {source_file}")

if __name__ == '__main__':
    empty_translatable_content()
