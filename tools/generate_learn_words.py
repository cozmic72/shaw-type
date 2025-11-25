#!/usr/bin/env python3
"""
Generate word lists for Learn mode based on Shavian keyboard layouts.
Progressive levels based on finger travel distance from home row.
"""

import json
from pathlib import Path
from keyboard_layout_loader import get_layout_for_learn_mode, LIGATURES, load_keyboard_layouts

# Define progressive levels for Shaw Imperial
LEARN_LEVELS_IMPERIAL = {
    1: {
        'nameKey': 'lessonHomeRowCenter',
        'chars': '𐑦𐑩𐑧𐑐𐑯𐑑',  # Middle 6 keys of home row
        'focus': '𐑦𐑩𐑧𐑐𐑯𐑑',  # All chars are new
        'descKey': 'desc1'
    },
    2: {
        'nameKey': 'lessonFullHomeRow',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # All home row
        'focus': '𐑪𐑨𐑮𐑕𐑛',  # New chars: outer home row keys
        'descKey': 'desc2'
    },
    3: {
        'nameKey': 'lessonIndexFingerReach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚',  # Home + index reaches
        'focus': '𐑓𐑒𐑝𐑚',  # New chars: index finger upper/lower
        'descKey': 'desc3'
    },
    4: {
        'nameKey': 'lessonUpperLowerRows',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # Add more upper/lower
        'focus': '𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # New chars: more upper/lower row keys
        'descKey': 'desc4'
    },
    5: {
        'nameKey': 'lessonNumberRowFocus',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # Level 4 chars + number row
        'focus': '𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # New chars: number row only
        'descKey': 'desc5'
    },
    6: {
        'nameKey': 'lessonHardToReach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑢𐑣𐑠',  # Level 5 + hard to reach chars
        'focus': '𐑢𐑣𐑠',  # New chars: hard to reach right side keys
        'descKey': 'desc6'
    },
    7: {
        'nameKey': 'lessonAllKeys',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # All
        'focus': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # Practice all keys
        'descKey': 'desc24'
    }
}

# Define progressive levels for New Shaw Imperial (with compounds in number row)
LEARN_LEVELS_NEW_IMPERIAL = {
    1: {
        'nameKey': 'lessonHomeRowCenter',
        'chars': '𐑦𐑩𐑧𐑐𐑯𐑑',  # Middle 6 keys of home row
        'focus': '𐑦𐑩𐑧𐑐𐑯𐑑',  # All chars are new
        'descKey': 'desc1'
    },
    2: {
        'nameKey': 'lessonFullHomeRow',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # All home row
        'focus': '𐑪𐑨𐑮𐑕𐑛',  # New chars: outer home row keys
        'descKey': 'desc2'
    },
    3: {
        'nameKey': 'lessonIndexFingerReach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚',  # Home + index reaches
        'focus': '𐑓𐑒𐑝𐑚',  # New chars: index finger upper/lower
        'descKey': 'desc3'
    },
    4: {
        'nameKey': 'lessonUpperLowerRows',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # Add more upper/lower
        'focus': '𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # New chars: more upper/lower row keys
        'descKey': 'desc4'
    },
    5: {
        'nameKey': 'lessonNumberRowFocus',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # Level 4 + number row (including compounds)
        'focus': '𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # New chars: number row with compounds
        'descKey': 'desc5'
    },
    6: {
        'nameKey': 'lessonHardToReach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑢𐑣𐑠',  # Level 5 + hard to reach chars
        'focus': '𐑢𐑣𐑠',  # New chars: hard to reach right side keys
        'descKey': 'desc6'
    },
    7: {
        'nameKey': 'lessonAllKeys',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # All
        'focus': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # Practice all keys
        'descKey': 'desc24'
    }
}

# Define progressive levels for Shaw QWERTY
LEARN_LEVELS_QWERTY = {
    1: {
        'nameKey': 'lessonHomeRowShift',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡',  # Home row both layers
        'focus': '𐑨𐑖𐑼𐑲·𐑞𐑡',  # New chars: shift layer home row
        'descKey': 'desc8'
    },
    2: {
        'nameKey': 'lessonAddUpperRow',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹',  # Add upper row
        'focus': '𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹',  # New chars: upper row both layers
        'descKey': 'desc9'
    },
    3: {
        'nameKey': 'lessonAddLowerRow',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵',  # Add lower row
        'focus': '𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵',  # New chars: lower row both layers
        'descKey': 'desc10'
    },
    4: {
        'nameKey': 'lessonAllKeys',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵𐑶𐑢𐑭𐑳𐑐𐑬𐑾𐑷𐑫𐑠⸰',  # All
        'focus': '𐑶𐑢𐑭𐑳𐑐𐑬𐑾𐑷𐑫𐑠⸰',  # New chars: remaining keys
        'descKey': 'desc6'
    }
}

# Define progressive levels for Shaw 2-layer (creative!)
LEARN_LEVELS_2LAYER = {
    1: {
        'nameKey': 'lessonEssentialPhonemes',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮',  # Most frequent sounds: schwa, n, t, d, s, v, th, l, r
        'focus': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮',  # All chars are new
        'descKey': 'desc11'
    },
    2: {
        'nameKey': 'lessonVowelVoyage',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷',  # Add vowels from base layer
        'focus': '𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷',  # New chars: vowels
        'descKey': 'desc12'
    },
    3: {
        'nameKey': 'lessonConsonantCommand',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗',  # Add remaining base consonants
        'focus': '𐑖𐑒𐑐𐑢𐑣𐑗',  # New chars: remaining consonants
        'descKey': 'desc13'
    },
    4: {
        'nameKey': 'lessonLigaturePower',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻',  # Add ligatures from both layers
        'focus': '𐑼𐑸𐑹𐑽𐑺𐑻',  # New chars: ligatures
        'descKey': 'desc14'
    },
    5: {
        'nameKey': 'lessonShiftMastery',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # Add most shift keys
        'focus': '𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # New chars: shift layer
        'descKey': 'desc15'
    },
    6: {
        'nameKey': 'lessonCompleteControl',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # All keys (same as level 5 - no new chars)
        'focus': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # Review all chars
        'descKey': 'desc16'
    }
}

# Define progressive levels for Shaw-JAFL (creative!)
LEARN_LEVELS_JAFL = {
    1: {
        'nameKey': 'lessonCoreFoundation',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑤𐑮𐑦𐑝𐑞',  # Most frequent letters available
        'focus': '𐑩𐑯𐑑𐑛𐑕𐑤𐑮𐑦𐑝𐑞',  # All chars are new
        'descKey': 'desc17'
    },
    2: {
        'nameKey': 'lessonHomeSweet',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢',  # Full home row (base)
        'focus': '𐑪𐑨𐑳𐑢',  # New chars: rest of home row
        'descKey': 'desc18'
    },
    3: {
        'nameKey': 'lessonUpperExpedition',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓',  # Add upper row (base)
        'focus': '𐑱𐑧𐑰𐑥𐑒𐑐𐑓',  # New chars: upper row (𐑑𐑛 already in level 1)
        'descKey': 'desc19'
    },
    4: {
        'nameKey': 'lessonLowerExploration',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚',  # Add lower row (base)
        'focus': '𐑲𐑴𐑟𐑣𐑚',  # New chars: lower row (𐑞𐑝 already in level 1)
        'descKey': 'desc20'
    },
    5: {
        'nameKey': 'lessonShiftIntroduction',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚𐑷𐑭𐑵𐑫𐑖𐑙𐑘',  # Add common shift keys
        'focus': '𐑷𐑭𐑵𐑫𐑖𐑙𐑘',  # New chars: shift layer
        'descKey': 'desc21'
    },
    6: {
        'nameKey': 'lessonMasterTypist',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚𐑷𐑭𐑵𐑫𐑖𐑙𐑘𐑬𐑹𐑸𐑿𐑜𐑗𐑡𐑶𐑔𐑠',  # All keys
        'focus': '𐑬𐑹𐑸𐑿𐑜𐑗𐑡𐑶𐑔𐑠',  # New chars: final shift keys
        'descKey': 'desc22'
    }
}


def is_shavian_only(word):
    """
    Check if a word contains only Shavian characters (U+10450 to U+1047F).
    Returns True if the word is purely Shavian, False otherwise.
    """
    for char in word:
        code_point = ord(char)
        # Check if character is in Shavian Unicode range
        if not (0x10450 <= code_point <= 0x1047F):
            return False
    return True


def is_shavian_only_with_namer_dot(word):
    """
    Check if a word contains only Shavian characters and optionally a namer dot (·).
    Returns True if the word is purely Shavian (with optional namer dot), False otherwise.
    """
    for char in word:
        code_point = ord(char)
        # Check if character is in Shavian Unicode range or is namer dot (U+00B7)
        if not ((0x10450 <= code_point <= 0x1047F) or code_point == 0x00B7):
            return False
    return True


def load_readlex_words(readlex_file, dialect='gb'):
    """
    Load words from readlex.json and select appropriate variant.
    
    Args:
        readlex_file: Path to readlex.json
        dialect: 'gb' for British (RRP), 'us' for American (GenAm preferred)
    
    Returns:
        List of (shavian_word, frequency) tuples
    """
    with open(readlex_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    words = []
    variant_pref = 'GenAm' if dialect == 'us' else 'RRP'
    
    for key, entries in data.items():
        # Select the appropriate variant
        selected_entry = None
        
        # First, try to find preferred variant
        for entry in entries:
            if entry.get('var') == variant_pref:
                selected_entry = entry
                break
        
        # If no preferred variant found, use RRP
        if selected_entry is None:
            for entry in entries:
                if entry.get('var') == 'RRP':
                    selected_entry = entry
                    break
        
        # Fallback to first entry if nothing else matches
        if selected_entry is None and len(entries) > 0:
            selected_entry = entries[0]
        
        if selected_entry:
            shaw_word = selected_entry.get('Shaw', '')
            freq = selected_entry.get('freq', 0)
            pos = selected_entry.get('pos', '')
            
            # Add namer dot for proper nouns (NP0, NP0+...)
            if pos.startswith('NP0') and shaw_word and not shaw_word.startswith('·'):
                shaw_word = '·' + shaw_word
            
            # Only include if it's purely Shavian (namer dot U+00B7 is allowed)
            if shaw_word and is_shavian_only_with_namer_dot(shaw_word):
                words.append((shaw_word, freq))
    
    return words


def expand_ligatures(word):
    """
    Expand ligatures in a word to their component characters.
    Returns the expanded form that would be typed.
    """
    expanded = word
    for ligature, (char1, char2) in LIGATURES.items():
        expanded = expanded.replace(ligature, char1 + char2)
    return expanded


def can_type_with_chars(word, available_chars, use_ligatures=True):
    """
    Check if a word can be typed using only the available characters.
    Expands ligatures first if use_ligatures is True.
    """
    if use_ligatures:
        expanded = expand_ligatures(word)
    else:
        expanded = word
    return all(char in available_chars for char in expanded)


def count_target_chars(word, new_chars, use_ligatures=True):
    """
    Count how many times the newly introduced characters appear in the word.
    This helps prioritize words that practice the new skills.
    """
    if use_ligatures:
        expanded = expand_ligatures(word)
    else:
        expanded = word
    return sum(1 for char in expanded if char in new_chars)


def get_new_chars_for_level(level_num, learn_levels):
    """
    Get characters introduced in this level (not in previous levels).
    """
    current_chars = set(learn_levels[level_num]['chars'])
    if level_num == 1:
        return current_chars
    prev_chars = set(learn_levels[level_num - 1]['chars'])
    return current_chars - prev_chars


def generate_learn_word_lists(readlex_file, learn_levels, output_file, layout_name, use_ligatures=True, dialect='gb', all_chars=''):
    """
    Generate word lists for each learning level for a specific layout.
    Words are selected to:
    - Include multiple instances of newly-introduced characters
    - Progress in length as levels advance
    - Remain high-frequency and useful

    A compound letter lesson is automatically inserted at third-from-last position.
    """
    # Load all words with frequency info from readlex
    all_words = load_readlex_words(readlex_file, dialect)

    print(f"\n{layout_name} Layout ({dialect.upper()}):")
    print(f"Loaded {len(all_words)} words from readlex")
    if use_ligatures:
        print(f"  Using ligature expansion")
    else:
        print(f"  No ligature expansion (raw characters only)")

    # Generate word lists for each level
    learn_words = {}

    for level_num, level_info in learn_levels.items():
        available_chars = level_info['chars']
        # Use 'focus' field if present, otherwise use new chars from this level
        if 'focus' in level_info:
            focus_chars = set(level_info['focus'])
        else:
            focus_chars = get_new_chars_for_level(level_num, learn_levels)

        # Collect candidate words
        candidates = []
        for word, freq in all_words:
            if can_type_with_chars(word, available_chars, use_ligatures):
                target_count = count_target_chars(word, focus_chars, use_ligatures)
                # Only include words with at least one character from the focus group
                if target_count > 0:
                    word_len = len(word)
                    # For Number Row Focus (level 5), use simpler scoring that doesn't favor multiple new chars
                    # This keeps words simpler and more approachable
                    if level_num == 5 and level_info['nameKey'] == 'lessonNumberRowFocus':
                        score = 1000 + (freq / 100) + (word_len * level_num)
                    else:
                        # Score combines: target char count (high priority), frequency (medium), length (grows with level)
                        score = (target_count * 1000) + (freq / 100) + (word_len * level_num)
                    candidates.append((word, score, target_count, word_len))

        # Sort by score (descending)
        candidates.sort(key=lambda x: x[1], reverse=True)

        # Take top 100, but ensure variety in length
        level_words = [word for word, score, tc, wl in candidates[:100]]

        # Skip levels with fewer than 5 words
        if len(level_words) < 5:
            print(f"  Level {level_num} ({level_info['nameKey']}): SKIPPED - only {len(level_words)} words available")
            continue

        learn_words[str(level_num)] = {
            'nameKey': level_info['nameKey'],
            'descKey': level_info['descKey'],
            'chars': level_info['chars'],
            'words': level_words
        }

        avg_len = sum(len(w) for w in level_words) / len(level_words) if level_words else 0
        print(f"  Level {level_num} ({level_info['nameKey']}): {len(level_words)} words (avg length: {avg_len:.1f})")

    # Generate and insert compound letter lesson before 'Almost Complete' and 'All Keys' lessons
    if all_chars and len(learn_words) >= 3:
        ligature_candidates = []
        for word, freq in all_words:
            ligature_count = sum(1 for ligature in LIGATURES.keys() if ligature in word)
            if ligature_count > 0 and can_type_with_chars(word, all_chars, use_ligatures=True):
                score = (ligature_count * 1000) + (freq / 100) + len(word)
                ligature_candidates.append((word, score))

        ligature_candidates.sort(key=lambda x: x[1], reverse=True)
        ligature_words = [word for word, score in ligature_candidates[:100]]

        if len(ligature_words) >= 5:
            compound_lesson = {
                'nameKey': 'lessonCompoundLetters',
                'descKey': 'desc7',
                'chars': all_chars,
                'words': ligature_words
            }
            avg_len = sum(len(w) for w in ligature_words) / len(ligature_words)
            print(f"  Compound Letters: {len(ligature_words)} words (avg length: {avg_len:.1f})")

            # Insert compound lesson at third from last position
            lesson_nums = sorted([int(k) for k in learn_words.keys()])
            insert_index = len(lesson_nums) - 2

            final_words = {}
            new_num = 1

            for i, lesson_num in enumerate(lesson_nums):
                if i == insert_index:
                    final_words[str(new_num)] = compound_lesson
                    new_num += 1

                final_words[str(new_num)] = learn_words[str(lesson_num)]
                new_num += 1

            learn_words = final_words
        else:
            print(f"  Compound Letters: SKIPPED - only {len(ligature_words)} words available")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(learn_words, f, ensure_ascii=False, indent=2)

    print(f"  Saved to {output_file}")


if __name__ == '__main__':
    # Load keyboard layouts from JSON
    keyboard_layouts = load_keyboard_layouts()

    # Get layouts organized by rows
    LAYOUT_IMPERIAL = get_layout_for_learn_mode('imperial', keyboard_layouts)
    LAYOUT_NEW_IMPERIAL = get_layout_for_learn_mode('igc', keyboard_layouts)  # IGC is the new imperial
    LAYOUT_QWERTY = get_layout_for_learn_mode('qwerty', keyboard_layouts)
    LAYOUT_2LAYER = get_layout_for_learn_mode('2layer', keyboard_layouts)
    LAYOUT_JAFL = get_layout_for_learn_mode('jafl', keyboard_layouts)

    # All chars for each layout (for compound letters lessons)
    all_imperial_chars = ''.join([
        LAYOUT_IMPERIAL['number'],
        LAYOUT_IMPERIAL['qwerty'],
        LAYOUT_IMPERIAL['home'],
        LAYOUT_IMPERIAL['bottom']
    ])

    all_new_imperial_chars = ''.join([
        LAYOUT_NEW_IMPERIAL['number'],
        LAYOUT_NEW_IMPERIAL['qwerty'],
        LAYOUT_NEW_IMPERIAL['home'],
        LAYOUT_NEW_IMPERIAL['bottom']
    ])

    all_qwerty_chars = ''.join([
        LAYOUT_QWERTY['qwerty'],
        LAYOUT_QWERTY['home'],
        LAYOUT_QWERTY['bottom']
    ])

    all_2layer_chars = ''.join([
        LAYOUT_2LAYER['qwerty'],
        LAYOUT_2LAYER['home'],
        LAYOUT_2LAYER['bottom']
    ])

    all_jafl_chars = ''.join([
        LAYOUT_JAFL['qwerty'],
        LAYOUT_JAFL['home'],
        LAYOUT_JAFL['bottom']
    ])

    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    readlex_file = project_dir / 'readlex' / 'readlex.json'
    
    if not readlex_file.exists():
        print(f"Error: readlex.json not found at {readlex_file}")
        print("Make sure the readlex submodule is initialized:")
        print("  git submodule update --init --recursive")
        exit(1)

    # Generate for both GB and US dialects
    for dialect in ['gb', 'us']:


        print(f"\n{'='*60}")
        print(f"Generating word lists for {dialect.upper()} English")
        print(f"{'='*60}")

        # Generate for Shaw Imperial (with ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_IMPERIAL,
            project_dir / 'site' / f'learn_words_imperial_{dialect}.json',
            'Shaw Imperial',
            use_ligatures=True,
            dialect=dialect,
            all_chars=all_imperial_chars
        )

        # Generate for Shaw Imperial (without ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_IMPERIAL,
            project_dir / 'site' / f'learn_words_imperial_{dialect}_no_lig.json',
            'Shaw Imperial (No Ligatures)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_imperial_chars
        )

        # Generate for Imperial Good Companion (with ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_NEW_IMPERIAL,
            project_dir / 'site' / f'learn_words_igc_{dialect}.json',
            'Imperial Good Companion',
            use_ligatures=True,
            dialect=dialect,
            all_chars=all_new_imperial_chars
        )

        # Generate for Imperial Good Companion (without ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_NEW_IMPERIAL,
            project_dir / 'site' / f'learn_words_igc_{dialect}_no_lig.json',
            'Imperial Good Companion (No Ligatures)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_new_imperial_chars
        )

        # Generate for Shaw QWERTY (no ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_QWERTY,
            project_dir / 'site' / f'learn_words_qwerty_{dialect}.json',
            'Shaw QWERTY',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_qwerty_chars
        )

        # Generate for Shaw 2-layer (no ligature support - ligatures are direct keys)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_2LAYER,
            project_dir / 'site' / f'learn_words_2layer_{dialect}.json',
            'Shaw 2-layer (shift)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_2layer_chars
        )

        # Generate for Shaw-JAFL (with ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_JAFL,
            project_dir / 'site' / f'learn_words_jafl_{dialect}.json',
            'Shaw-JAFL',
            use_ligatures=True,
            dialect=dialect,
            all_chars=all_jafl_chars
        )

        # Generate for Shaw-JAFL (without ligatures)
        generate_learn_word_lists(
            readlex_file,
            LEARN_LEVELS_JAFL,
            project_dir / 'site' / f'learn_words_jafl_{dialect}_no_lig.json',
            'Shaw-JAFL (No Ligatures)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_jafl_chars
        )
