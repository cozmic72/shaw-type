#!/usr/bin/env python3
"""
Generate word lists for Learn mode based on Shavian keyboard layouts.
Progressive levels based on finger travel distance from home row.
"""

import json

# Shaw Imperial keyboard layout (ANSI US)
LAYOUT_IMPERIAL = {
    'number': '𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # 1-0 keys
    'qwerty': '𐑭𐑷𐑵𐑱𐑳𐑓𐑞𐑤𐑥𐑒𐑢𐑣𐑠',  # q to \ keys
    'home': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # a to ; keys (home row)
    'bottom': '𐑾𐑲𐑴𐑰𐑚𐑝𐑟'  # z to / keys
}

# New Shaw Imperial keyboard layout (ANSI US) - includes compound chars in number row
LAYOUT_NEW_IMPERIAL = {
    'number': '𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # 1-0 plus - = keys (includes 𐑻 𐑺 compounds)
    'qwerty': '𐑭𐑷𐑵𐑱𐑳𐑓𐑞𐑤𐑥𐑒𐑢𐑣𐑠',  # q to \ keys
    'home': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # a to ; keys (home row)
    'bottom': '𐑾𐑲𐑴𐑰𐑚𐑝𐑟'  # z to / keys
}

# Shaw QWERTY keyboard layout (no number row)
# Base layer (unshifted)
LAYOUT_QWERTY_BASE = {
    'qwerty': '𐑶𐑢𐑧𐑮𐑑𐑭𐑳𐑦𐑪𐑐',  # q to p keys
    'home': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤',  # a to l keys (home row)
    'bottom': '𐑟𐑻𐑗𐑝𐑚𐑯𐑥'  # z to m keys
}

# Shift layer
LAYOUT_QWERTY_SHIFT = {
    'qwerty': '𐑬𐑾𐑱𐑸𐑔𐑷𐑫𐑰𐑴𐑹',  # q to p keys (shifted)
    'home': '𐑨𐑖𐑼𐑲·𐑞𐑡',  # a to l keys (shifted)
    'bottom': '𐑠𐑺𐑽𐑿⸰𐑙𐑵'  # z to m keys (shifted)
}

# Combine both layers for Shaw QWERTY
LAYOUT_QWERTY = {
    'qwerty': LAYOUT_QWERTY_BASE['qwerty'] + LAYOUT_QWERTY_SHIFT['qwerty'],
    'home': LAYOUT_QWERTY_BASE['home'] + LAYOUT_QWERTY_SHIFT['home'],
    'bottom': LAYOUT_QWERTY_BASE['bottom'] + LAYOUT_QWERTY_SHIFT['bottom']
}

# Shaw 2-layer (shift) keyboard layout (no number row)
# Base layer
LAYOUT_2LAYER_BASE = {
    'qwerty': '𐑵𐑧𐑨𐑭𐑬𐑝𐑢𐑞𐑣',  # q to p keys (minus punctuation)
    'home': '𐑤𐑦𐑩𐑯𐑷𐑖𐑑𐑕𐑒𐑐',  # a to ; keys
    'bottom': '𐑪𐑳𐑼𐑴𐑗'  # z to m keys (minus punctuation)
}

# Shift layer
LAYOUT_2LAYER_SHIFT = {
    'qwerty': '𐑿𐑱𐑲𐑸𐑶𐑓𐑘𐑔𐑙',  # q to p keys (shifted, minus punctuation)
    'home': '𐑮𐑰𐑾𐑥𐑹𐑠𐑛𐑟𐑜𐑚',  # a to ; keys (shifted)
    'bottom': '𐑺𐑻𐑽𐑫𐑡'  # z to m keys (shifted, minus punctuation)
}

# Combine both layers for Shaw 2-layer
LAYOUT_2LAYER = {
    'qwerty': LAYOUT_2LAYER_BASE['qwerty'] + LAYOUT_2LAYER_SHIFT['qwerty'],
    'home': LAYOUT_2LAYER_BASE['home'] + LAYOUT_2LAYER_SHIFT['home'],
    'bottom': LAYOUT_2LAYER_BASE['bottom'] + LAYOUT_2LAYER_SHIFT['bottom']
}

# Shaw-JAFL keyboard layout (no number row)
# Base layer
LAYOUT_JAFL_BASE = {
    'qwerty': '𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓',  # q to p keys (minus punctuation)
    'home': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢',  # a to ; keys
    'bottom': '𐑲𐑴𐑞𐑟𐑣𐑝𐑚'  # z to m keys (minus punctuation)
}

# Shift layer
LAYOUT_JAFL_SHIFT = {
    'qwerty': '𐑬𐑹𐑸𐑿𐑜𐑗𐑡',  # q to p keys (shifted, minus punctuation)
    'home': '𐑷𐑭𐑩𐑵𐑫𐑮𐑖𐑙𐑘',  # a to ; keys (shifted, note 𐑩 appears in both)
    'bottom': '𐑶𐑔𐑠'  # z to m keys (shifted, minus punctuation)
}

# Combine both layers for Shaw-JAFL
LAYOUT_JAFL = {
    'qwerty': LAYOUT_JAFL_BASE['qwerty'] + LAYOUT_JAFL_SHIFT['qwerty'],
    'home': LAYOUT_JAFL_BASE['home'] + LAYOUT_JAFL_SHIFT['home'],
    'bottom': LAYOUT_JAFL_BASE['bottom'] + LAYOUT_JAFL_SHIFT['bottom']
}

# Ligatures: compound letters formed by typing two characters
# Format: ligature -> (char1, char2)
LIGATURES = {
    '𐑼': ('𐑩', '𐑮'),  # ER ligature
    '𐑸': ('𐑭', '𐑮'),  # AR ligature
    '𐑹': ('𐑷', '𐑮'),  # OR ligature
    '𐑿': ('𐑘', '𐑵'),  # YEW ligature
    '𐑽': ('𐑾', '𐑮')   # AIR ligature
}

# Define progressive levels for Shaw Imperial
LEARN_LEVELS_IMPERIAL = {
    1: {
        'name': 'Home Row Center',
        'chars': '𐑦𐑩𐑧𐑐𐑯𐑑',  # Middle 6 keys of home row
        'focus': '𐑦𐑩𐑧𐑐𐑯𐑑',  # All chars are new
        'description': 'Middle fingers only, home row'
    },
    2: {
        'name': 'Full Home Row',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # All home row
        'focus': '𐑪𐑨𐑮𐑕𐑛',  # New chars: outer home row keys
        'description': 'All fingers, home row'
    },
    3: {
        'name': 'Index Finger Reach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚',  # Home + index reaches
        'focus': '𐑓𐑒𐑝𐑚',  # New chars: index finger upper/lower
        'description': 'Add index finger upper/lower reaches'
    },
    4: {
        'name': 'Upper & Lower Rows',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # Add more upper/lower
        'focus': '𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # New chars: more upper/lower row keys
        'description': 'Extend to more keys above and below'
    },
    5: {
        'name': 'Number Row Focus',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # Level 4 chars + number row
        'focus': '𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # New chars: number row only
        'description': 'Master the number row characters'
    },
    6: {
        'name': 'Hard to Reach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑢𐑣𐑠',  # Level 5 + hard to reach chars
        'focus': '𐑢𐑣𐑠',  # New chars: hard to reach right side keys
        'description': 'Master the hard to reach characters'
    },
    7: {
        'name': 'All Keys',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # All
        'focus': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # Practice all keys
        'description': 'Complete keyboard'
    }
}

# Define progressive levels for New Shaw Imperial (with compounds in number row)
LEARN_LEVELS_NEW_IMPERIAL = {
    1: {
        'name': 'Home Row Center',
        'chars': '𐑦𐑩𐑧𐑐𐑯𐑑',  # Middle 6 keys of home row
        'focus': '𐑦𐑩𐑧𐑐𐑯𐑑',  # All chars are new
        'description': 'Middle fingers only, home row'
    },
    2: {
        'name': 'Full Home Row',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # All home row
        'focus': '𐑪𐑨𐑮𐑕𐑛',  # New chars: outer home row keys
        'description': 'All fingers, home row'
    },
    3: {
        'name': 'Index Finger Reach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚',  # Home + index reaches
        'focus': '𐑓𐑒𐑝𐑚',  # New chars: index finger upper/lower
        'description': 'Add index finger upper/lower reaches'
    },
    4: {
        'name': 'Upper & Lower Rows',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # Add more upper/lower
        'focus': '𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # New chars: more upper/lower row keys
        'description': 'Extend to more keys above and below'
    },
    5: {
        'name': 'Number Row Focus',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # Level 4 + number row (including compounds)
        'focus': '𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # New chars: number row with compounds
        'description': 'Master the number row characters'
    },
    6: {
        'name': 'Hard to Reach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑢𐑣𐑠',  # Level 5 + hard to reach chars
        'focus': '𐑢𐑣𐑠',  # New chars: hard to reach right side keys
        'description': 'Master the hard to reach characters'
    },
    7: {
        'name': 'All Keys',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # All
        'focus': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑶𐑬𐑻𐑫𐑺𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑭𐑷𐑵𐑢𐑣𐑟𐑠',  # Practice all keys
        'description': 'Complete keyboard'
    }
}

# Define progressive levels for Shaw QWERTY
LEARN_LEVELS_QWERTY = {
    1: {
        'name': 'Home Row Center',
        'chars': '𐑛𐑓𐑜𐑣𐑘𐑒',  # Middle 6 keys of home row
        'focus': '𐑛𐑓𐑜𐑣𐑘𐑒',  # All chars are new
        'description': 'Middle fingers only, home row'
    },
    2: {
        'name': 'Full Home Row',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤',  # All home row (base layer)
        'focus': '𐑩𐑕𐑤',  # New chars: outer home row keys
        'description': 'All fingers, home row (unshifted)'
    },
    3: {
        'name': 'Home Row + Shift',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡',  # Home row both layers
        'focus': '𐑨𐑖𐑼𐑲·𐑞𐑡',  # New chars: shift layer home row
        'description': 'Home row with shift layer'
    },
    4: {
        'name': 'Add Upper Row',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹',  # Add upper row
        'focus': '𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹',  # New chars: upper row both layers
        'description': 'Add upper row (both layers)'
    },
    5: {
        'name': 'Add Lower Row',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵',  # Add lower row
        'focus': '𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵',  # New chars: lower row both layers
        'description': 'Add lower row (both layers)'
    },
    6: {
        'name': 'All Keys',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵𐑶𐑢𐑭𐑳𐑐𐑬𐑾𐑷𐑫𐑠⸰',  # All
        'focus': '𐑶𐑢𐑭𐑳𐑐𐑬𐑾𐑷𐑫𐑠⸰',  # New chars: remaining keys
        'description': 'Complete keyboard (all layers)'
    }
}

# Define progressive levels for Shaw 2-layer (creative!)
LEARN_LEVELS_2LAYER = {
    1: {
        'name': 'Essential Phonemes',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮',  # Most frequent sounds: schwa, n, t, d, s, v, th, l, r
        'focus': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮',  # All chars are new
        'description': 'Master the 9 most common sounds in English'
    },
    2: {
        'name': 'Vowel Voyage',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷',  # Add vowels from base layer
        'focus': '𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷',  # New chars: vowels
        'description': 'Navigate through English vowel sounds'
    },
    3: {
        'name': 'Consonant Command',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗',  # Add remaining base consonants
        'focus': '𐑖𐑒𐑐𐑢𐑣𐑗',  # New chars: remaining consonants
        'description': 'Build confidence with base layer consonants'
    },
    4: {
        'name': 'Ligature Power',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻',  # Add ligatures from both layers
        'focus': '𐑼𐑸𐑹𐑽𐑺𐑻',  # New chars: ligatures
        'description': 'Harness the efficiency of compound letters'
    },
    5: {
        'name': 'Shift Mastery',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # Add most shift keys
        'focus': '𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # New chars: shift layer
        'description': 'Unlock the full potential of the shift layer'
    },
    6: {
        'name': 'Complete Control',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # All keys (same as level 5 - no new chars)
        'focus': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # Review all chars
        'description': 'Command every key with confidence'
    }
}

# Define progressive levels for Shaw-JAFL (creative!)
LEARN_LEVELS_JAFL = {
    1: {
        'name': 'Core Foundation',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑤𐑮𐑦𐑝𐑞',  # Most frequent letters available
        'focus': '𐑩𐑯𐑑𐑛𐑕𐑤𐑮𐑦𐑝𐑞',  # All chars are new
        'description': 'Build your foundation with essential sounds'
    },
    2: {
        'name': 'Home Sweet Home',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢',  # Full home row (base)
        'focus': '𐑪𐑨𐑳𐑢',  # New chars: rest of home row
        'description': 'Master the comfort of the home row'
    },
    3: {
        'name': 'Upper Expedition',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓',  # Add upper row (base)
        'focus': '𐑱𐑧𐑰𐑥𐑒𐑐𐑓',  # New chars: upper row (𐑑𐑛 already in level 1)
        'description': 'Journey to the upper reaches of your keyboard'
    },
    4: {
        'name': 'Lower Exploration',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚',  # Add lower row (base)
        'focus': '𐑲𐑴𐑟𐑣𐑚',  # New chars: lower row (𐑞𐑝 already in level 1)
        'description': 'Explore the depths below home position'
    },
    5: {
        'name': 'Shift Introduction',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚𐑷𐑭𐑵𐑫𐑖𐑙𐑘',  # Add common shift keys
        'focus': '𐑷𐑭𐑵𐑫𐑖𐑙𐑘',  # New chars: shift layer
        'description': 'Discover new dimensions with the shift key'
    },
    6: {
        'name': 'Master Typist',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚𐑷𐑭𐑵𐑫𐑖𐑙𐑘𐑬𐑹𐑸𐑿𐑜𐑗𐑡𐑶𐑔𐑠',  # All keys
        'focus': '𐑬𐑹𐑸𐑿𐑜𐑗𐑡𐑶𐑔𐑠',  # New chars: final shift keys
        'description': 'Achieve mastery over the complete keyboard'
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


def generate_learn_word_lists(word_freq_file, learn_levels, output_file, layout_name, use_ligatures=True, dialect='gb', all_chars=''):
    """
    Generate word lists for each learning level for a specific layout.
    Words are selected to:
    - Include multiple instances of newly-introduced characters
    - Progress in length as levels advance
    - Remain high-frequency and useful

    A compound letter lesson is automatically inserted at third-from-last position.
    """
    # Load all words with frequency info
    all_words = []
    filtered_count = 0
    with open(word_freq_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            parts = line.strip().split()
            if len(parts) >= 2:
                word = parts[0]
                # Skip words with non-Shavian characters
                if not is_shavian_only(word):
                    filtered_count += 1
                    continue
                try:
                    freq = int(parts[1])
                    all_words.append((word, freq))
                except ValueError:
                    print(f"  Warning: Skipping line {line_num}: {line.strip()}")
                    continue

    print(f"\n{layout_name} Layout ({dialect.upper()}):")
    print(f"Loaded {len(all_words)} words from frequency file (filtered {filtered_count} non-Shavian words)")
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
                    if level_num == 5 and level_info['name'] == 'Number Row Focus':
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
            print(f"  Level {level_num} ({level_info['name']}): SKIPPED - only {len(level_words)} words available")
            continue

        learn_words[str(level_num)] = {
            'name': level_info['name'],
            'description': level_info['description'],
            'chars': level_info['chars'],
            'words': level_words
        }

        avg_len = sum(len(w) for w in level_words) / len(level_words) if level_words else 0
        print(f"  Level {level_num} ({level_info['name']}): {len(level_words)} words (avg length: {avg_len:.1f})")

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
                'name': 'Compound Letters',
                'description': 'Practice typing ligatures: 𐑼 𐑸 𐑹 𐑿 𐑽',
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

    # Generate for both GB and US dialects
    for dialect in ['gb', 'us']:
        word_freq_file = f'shavian-{dialect}-word-frequencies.txt'

        print(f"\n{'='*60}")
        print(f"Generating word lists for {dialect.upper()} English")
        print(f"{'='*60}")

        # Generate for Shaw Imperial (with ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_IMPERIAL,
            f'../site/learn_words_imperial_{dialect}.json',
            'Shaw Imperial',
            use_ligatures=True,
            dialect=dialect,
            all_chars=all_imperial_chars
        )

        # Generate for Shaw Imperial (without ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_IMPERIAL,
            f'../site/learn_words_imperial_{dialect}_no_lig.json',
            'Shaw Imperial (No Ligatures)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_imperial_chars
        )

        # Generate for Imperial Good Companion (with ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_NEW_IMPERIAL,
            f'../site/learn_words_igc_{dialect}.json',
            'Imperial Good Companion',
            use_ligatures=True,
            dialect=dialect,
            all_chars=all_new_imperial_chars
        )

        # Generate for Imperial Good Companion (without ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_NEW_IMPERIAL,
            f'../site/learn_words_igc_{dialect}_no_lig.json',
            'Imperial Good Companion (No Ligatures)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_new_imperial_chars
        )

        # Generate for Shaw QWERTY (no ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_QWERTY,
            f'../site/learn_words_qwerty_{dialect}.json',
            'Shaw QWERTY',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_qwerty_chars
        )

        # Generate for Shaw 2-layer (no ligature support - ligatures are direct keys)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_2LAYER,
            f'../site/learn_words_2layer_{dialect}.json',
            'Shaw 2-layer (shift)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_2layer_chars
        )

        # Generate for Shaw-JAFL (with ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_JAFL,
            f'../site/learn_words_jafl_{dialect}.json',
            'Shaw-JAFL',
            use_ligatures=True,
            dialect=dialect,
            all_chars=all_jafl_chars
        )

        # Generate for Shaw-JAFL (without ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_JAFL,
            f'../site/learn_words_jafl_{dialect}_no_lig.json',
            'Shaw-JAFL (No Ligatures)',
            use_ligatures=False,
            dialect=dialect,
            all_chars=all_jafl_chars
        )
