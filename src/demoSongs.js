const STD_SECTIONS = [
  { id: 'intro',   name: 'Intro',   bars: 4, dmxScene: 'intro'  },
  { id: 'verse1',  name: 'Verse 1', bars: 8, dmxScene: 'verse'  },
  { id: 'chorus1', name: 'Chorus',  bars: 8, dmxScene: 'chorus' },
  { id: 'verse2',  name: 'Verse 2', bars: 8, dmxScene: 'verse'  },
  { id: 'chorus2', name: 'Chorus',  bars: 8, dmxScene: 'chorus' },
  { id: 'bridge',  name: 'Bridge',  bars: 8, dmxScene: 'bridge' },
  { id: 'chorus3', name: 'Chorus',  bars: 8, dmxScene: 'chorus' },
  { id: 'outro',   name: 'Outro',   bars: 4, dmxScene: 'outro'  },
]

const STD_DMX = {
  intro:  { pars:[40,40,40,40,40,40],       wash:[0,0,0,0],         strobe:0,  laser:30,  smoke:20 },
  verse:  { pars:[80,60,80,60,80,60],       wash:[60,60,60,60],     strobe:0,  laser:0,   smoke:0  },
  chorus: { pars:[255,255,255,255,255,255], wash:[200,200,200,200], strobe:60, laser:80,  smoke:40 },
  bridge: { pars:[120,0,120,0,120,0],       wash:[100,0,100,0],     strobe:30, laser:120, smoke:0  },
  outro:  { pars:[30,30,30,30,30,30],       wash:[20,20,20,20],     strobe:0,  laser:0,   smoke:10 },
}

function s(id, title, artist, bpm, key) {
  return { id, title, artist, bpm, key, timeSignature: [4, 4], sections: STD_SECTIONS, dmxScenes: STD_DMX }
}

export const DEMO_SONGS = [
  // — 3OH!3 —
  s('3oh3-dont-trust-me',          "Don't Trust Me",                              '3OH!3',                        130, 'F major'),

  // — A Day to Remember —
  s('adtr-downfall',               'Downfall of Us All',                          'A Day to Remember',            200, 'B major'),
  s('adtr-since-u-been-gone',      'Since U Been Gone',                           'A Day to Remember/Kelly Clarkson', 128, 'A major'),

  // — All American Rejects —
  s('aar-dirty-little-secret',     'Dirty Little Secret',                         'All American Rejects',         144, 'B minor'),
  s('aar-move-along',              'Move Along',                                  'All American Rejects',         148, 'G major'),
  s('aar-swing-swing',             'Swing Swing',                                 'All American Rejects',         127, 'D minor'),

  // — All Time Low —
  s('atl-umbrella',                'Umbrella',                                    'All Time Low/Rihanna',          89, 'B minor'),
  s('atl-dear-maria',              'Dear Maria Count Me In',                      'All Time Low',                 182, 'B major'),

  // — Avenged Sevenfold —
  s('a7x-bat-country',             'Bat Country',                                 'Avenged Sevenfold',            175, 'E minor'),

  // — Avril Lavigne —
  s('avril-complicated',           'Complicated',                                 'Avril Lavigne',                120, 'A major'),
  s('avril-sk8r-boi',              'Sk8r Boi',                                    'Avril Lavigne',                150, 'A major'),
  s('avril-my-happy-ending',       'My Happy Ending',                             'Avril Lavigne',                170, 'E major'),

  // — Backstreet Boys —
  s('bsb-backstreets-back',        "Backstreet's Back",                           'Backstreet Boys',              108, 'A minor'),

  // — Blink 182 —
  s('blink-all-small-things',      'All The Small Things',                        'Blink 182',                    148, 'C major'),
  s('blink-dammit',                'Dammit',                                      'Blink 182',                    168, 'G major'),
  s('blink-feeling-this',          'Feeling This',                                'Blink 182',                    186, 'F# major'),
  s('blink-i-miss-you',            'I Miss You',                                  'Blink 182',                     94, 'D minor'),
  s('blink-stay-together',         'Stay Together For the Kids',                  'Blink 182',                    148, 'D major'),
  s('blink-rock-show',             'The Rock Show',                               'Blink 182',                    184, 'B major'),

  // — Brand New —
  s('brand-new-seventy-times-7',   'Seventy Times 7',                             'Brand New',                    160, 'G major'),

  // — Bowling For Soup —
  s('bfs-1985',                    '1985',                                        'Bowling For Soup',             146, 'G major'),

  // — Chappell Roan —
  s('chappell-good-luck-babe',     'Good Luck Babe',                              'Chappell Roan',                117, 'G major'),
  s('chappell-hot-to-go',          'Hot to Go',                                   'Chappell Roan',                126, 'E major'),
  s('chappell-red-wine-supernova', "Red Wine Supernova (What's Up mashup)",       "Chappell Roan/4 Non Blondes",  110, 'A major'),
  s('chappell-pink-pony-club',     'Pink Pony Club',                              'Chappell Roan',                120, 'G major'),

  // — Coheed and Cambria —
  s('coheed-favor-house',          'A Favor House Atlantic',                      'Coheed and Cambria',           166, 'Eb major'),

  // — Cranberries —
  s('cranberries-zombie',          'Zombie',                                      'Cranberries',                   82, 'E minor'),

  // — Dashboard Confessional —
  s('dc-vindicated',               'Vindicated',                                  'Dashboard Confessional',       132, 'A major'),

  // — Eagles —
  s('eagles-hotel-california',     'Hotel California',                            'Eagles',                        75, 'B minor'),

  // — Evanescence —
  s('evan-bring-me-to-life',       'Bring Me to Life',                            'Evanescence',                   96, 'Eb minor'),
  s('evan-going-under',            'Going Under',                                 'Evanescence',                  178, 'C# minor'),

  // — Fall Out Boy —
  s('fob-dance-dance',             'Dance Dance',                                 'Fall Out Boy',                 192, 'Bb minor'),
  s('fob-grand-theft-autumn',      'Grand Theft Autumn',                          'Fall Out Boy',                 160, 'C major'),
  s('fob-sugar',                   "Sugar We're Going Down",                      'Fall Out Boy',                 162, 'Eb major'),

  // — Forever the Sickest Kids —
  s('ftsk-shes-a-lady',            "She's a Lady",                                'Forever the Sickest Kids',     163, 'G major'),

  // — Fountains of Wayne —
  s('fow-staceys-mom',             "Stacy's Mom",                                 'Fountains of Wayne',           118, 'A major'),

  // — Good Charlotte —
  s('gc-dance-floor-anthem',       'Dance Floor Anthem',                          'Good Charlotte',               140, 'G major'),
  s('gc-the-anthem',               'The Anthem',                                  'Good Charlotte',               182, 'G major'),

  // — Green Day —
  s('gd-american-idiot',           'American Idiot',                              'Green Day',                    180, 'F# minor'),
  s('gd-basket-case',              'Basket Case',                                 'Green Day',                    170, 'Eb major'),
  s('gd-boulevard',                'Boulevard of Broken Dreams',                  'Green Day',                     84, 'F minor'),
  s('gd-welcome-to-paradise',      'Welcome to Paradise',                         'Green Day',                    168, 'B major'),

  // — Guns N' Roses —
  s('gnr-sweet-child',             "Sweet Child O' Mine",                         "Guns N' Roses",                125, 'D major'),

  // — Hawthorne Heights —
  s('hh-ohio',                     'Ohio Is For Lovers',                          'Hawthorne Heights',            170, 'Bb minor'),

  // — HelloGoodbye —
  s('hellogoodbye-here',           'Here',                                        'HelloGoodbye',                 126, 'G major'),

  // — Jimmy Eat World —
  s('jew-sweetness',               'Sweetness',                                   'Jimmy Eat World',              190, 'D major'),
  s('jew-the-middle',              'The Middle',                                  'Jimmy Eat World',              162, 'D major'),

  // — Journey —
  s('journey-dont-stop-believin',  "Don't Stop Believin'",                        'Journey',                      118, 'E major'),

  // — Kansas —
  s('kansas-carry-on',             'Carry On Wayward Son',                        'Kansas',                       138, 'A major'),

  // — Kate Bush —
  s('kate-bush-running-up',        'Running Up That Hill',                        'Kate Bush',                    108, 'D minor'),

  // — Korn —
  s('korn-freak-on-a-leash',       'Freak on a Leash',                            'Korn',                         103, 'D minor'),

  // — Lady Gaga —
  s('gaga-abracadabra',            'Abracadabra',                                 'Lady Gaga',                    126, 'D minor'),
  s('gaga-bad-romance',            'Bad Romance',                                 'Lady Gaga',                    119, 'Ab major'),
  s('gaga-zombie-boy',             'Zombie Boy',                                  'Lady Gaga',                    122, 'F minor'),

  // — Linkin Park —
  s('lp-breaking-the-habit',       'Breaking the Habit',                          'Linkin Park',                  100, 'Eb minor'),

  // — Lit —
  s('lit-my-own-worst-enemy',      'My Own Worst Enemy',                          'Lit',                          174, 'C major'),

  // — Lustra —
  s('lustra-scotty',               "Scotty Doesn't Know",                         'Lustra',                       174, 'A major'),

  // — Mayday Parade —
  s('mayday-jamie-all-over',       'Jamie All Over',                              'Mayday Parade',                149, 'G major'),

  // — Metric —
  s('metric-black-sheep',          'Black Sheep',                                 'Metric',                       124, 'G minor'),

  // — Metro Station —
  s('metro-shake-it',              'Shake It',                                    'Metro Station',                150, 'E major'),

  // — Miley Cyrus —
  s('miley-see-you-again',         'See You Again',                               'Miley Cyrus',                   80, 'A major'),
  s('miley-wrecking-ball',         'Wrecking Ball',                               'Miley Cyrus',                   72, 'G major'),

  // — Motion City Soundtrack —
  s('mcs-everything-alright',      'Everything Is Alright',                       'Motion City Soundtrack',       160, 'D major'),

  // — My Chemical Romance —
  s('mcr-helena',                  'Helena',                                      'My Chemical Romance',          126, 'F major'),
  s('mcr-i-dont-love-you',         "I Don't Love You",                            'My Chemical Romance',          104, 'D major'),
  s('mcr-im-not-okay',             "I'm Not Okay (I Promise)",                    'My Chemical Romance',          180, 'Bb major'),
  s('mcr-thank-you-for-the-venom', 'Thank You For the Venom',                     'My Chemical Romance',          190, 'D minor'),
  s('mcr-famous-parade',           'Famous Last Words / Welcome to the Black Parade', 'My Chemical Romance',       90, 'G major'),

  // — New Found Glory —
  s('nfg-all-downhill',            'All Downhill From Here',                      'New Found Glory',              168, 'E major'),
  s('nfg-my-friends-over-you',     'My Friends Over You',                         'New Found Glory',              178, 'D major'),
  s('nfg-hit-or-miss',             'Hit or Miss',                                 'New Found Glory',              173, 'A major'),
  s('nfg-king-of-wishful',         'King of Wishful Thinking',                    'New Found Glory',              117, 'G major'),
  s('nfg-understatement',          'Understatement',                              'New Found Glory',              124, 'B major'),

  // — No Doubt —
  s('no-doubt-just-a-girl',        'Just a Girl',                                 'No Doubt',                     108, 'F# major'),

  // — Offspring —
  s('offspring-keep-em-separated', "Come Out and Play (Keep 'Em Separated)",      'Offspring',                    158, 'D major'),
  s('offspring-kids-arent-alright', "The Kids Aren't Alright",                    'Offspring',                    172, 'G major'),

  // — Ozzy Osbourne —
  s('ozzy-crazy-train',            'Crazy Train',                                 'Ozzy Osbourne',                138, 'A major'),

  // — Panic! at the Disco —
  s('patd-i-write-sins',           'I Write Sins Not Tragedies',                  'Panic! at the Disco',           96, 'Ab major'),
  s('patd-nine-in-the-afternoon',  'Nine in the Afternoon',                       'Panic! at the Disco',          155, 'Bb major'),
  s('patd-time-to-dance',          'Time to Dance',                               'Panic! at the Disco',          170, 'E major'),

  // — Paramore —
  s('paramore-misery-business',    'Misery Business',                             'Paramore',                     173, 'D major'),
  s('paramore-still-into-you',     'Still Into You',                              'Paramore',                     136, 'D major'),
  s('paramore-thats-what-you-get', "That's What You Get",                         'Paramore',                     131, 'D major'),

  // — Pat Benatar —
  s('pat-benatar-hit-me',          'Hit Me With Your Best Shot',                  'Pat Benatar',                  127, 'E major'),

  // — Papa Roach —
  s('papa-roach-last-resort',      'Last Resort',                                 'Papa Roach',                   164, 'Bb minor'),

  // — Radiohead —
  s('radiohead-creep',             'Creep',                                       'Radiohead',                     92, 'G major'),

  // — The Red Jumpsuit Apparatus —
  s('rja-face-down',               'Face Down',                                   'The Red Jumpsuit Apparatus',   160, 'Eb major'),

  // — Puddle of Mudd —
  s('pom-blurry',                  'Blurry',                                      'Puddle of Mudd',                76, 'D major'),

  // — Secondhand Serenade —
  s('shs-fall-for-you',            'Fall For You',                                'Secondhand Serenade',           84, 'Bb major'),

  // — Silverstein —
  s('silverstein-smile',           'Smile in Your Sleep',                         'Silverstein',                  184, 'Eb major'),

  // — Simple Plan —
  s('sp-addicted',                 'Addicted',                                    'Simple Plan',                  140, 'D major'),
  s('sp-im-just-a-kid',            "I'm Just a Kid",                              'Simple Plan',                  186, 'E major'),
  s('sp-perfect',                  'Perfect',                                     'Simple Plan',                  106, 'C major'),

  // — System of a Down —
  s('soad-chop-suey',              'Chop Suey!',                                  'System of a Down',             206, 'C# minor'),
  s('soad-lonely-day',             'Lonely Day',                                  'System of a Down',             112, 'Bb minor'),
  s('soad-toxicity',               'Toxicity',                                    'System of a Down',             117, 'D minor'),

  // — Story of the Year —
  s('soty-until-the-day',          'Until the Day I Die',                         'Story of the Year',            138, 'A major'),

  // — Sublime —
  s('sublime-santeria',            'Santeria',                                    'Sublime',                       90, 'E major'),

  // — Sugarcult —
  s('sugarcult-memory',            'Memory',                                      'Sugarcult',                    167, 'Bb major'),

  // — Sum 41 —
  s('sum41-fat-lip',               'Fat Lip',                                     'Sum 41',                       184, 'D major'),
  s('sum41-in-too-deep',           'In Too Deep',                                 'Sum 41',                       168, 'G major'),
  s('sum41-hell-song',             'The Hell Song',                               'Sum 41',                       173, 'G major'),

  // — Taking Back Sunday —
  s('tbs-cute-without-the-e',      'Cute Without the E',                          'Taking Back Sunday',           168, 'Bb minor'),
  s('tbs-makedamnsure',            'MakeDamnSure',                                'Taking Back Sunday',           190, 'C minor'),

  // — The Killers —
  s('killers-mr-brightside',       'Mr. Brightside',                              'The Killers',                  148, 'C major'),

  // — The Outfield —
  s('outfield-your-love',          'Your Love',                                   'The Outfield',                 130, 'G major'),

  // — The Starting Line —
  s('starting-line-best-of-me',    'The Best of Me',                              'The Starting Line',            176, 'D major'),

  // — We The Kings —
  s('wtk-check-yes-juliet',        'Check Yes Juliet',                            'We The Kings',                 167, 'G major'),

  // — Wheatus —
  s('wheatus-teenage-dirtbag',     'Teenage Dirtbag',                             'Wheatus',                       95, 'A major'),

  // — Whitney Houston / Fall Out Boy —
  s('whitney-fob-dance',           'I Wanna Dance with Somebody',                 'Whitney Houston/Fall Out Boy', 120, 'A major'),

  // — Yellowcard —
  s('yc-ocean-avenue',             'Ocean Avenue',                                'Yellowcard',                   174, 'E major'),
]

export const DEMO_BREAKS = [
  { id: 'break-banter', type: 'break', name: 'Banter Break', durationMins: 3,
    dmxScene: { pars:[60,40,60,40,60,40], wash:[80,60,80,60], strobe:0, laser:0, smoke:10 } },
  { id: 'break-tuning', type: 'break', name: 'Tuning Break', durationMins: 2,
    dmxScene: { pars:[20,20,20,20,20,20], wash:[30,30,30,30], strobe:0, laser:0, smoke:0 } },
  { id: 'break-crowd', type: 'break', name: 'Crowd Interaction', durationMins: 4,
    dmxScene: { pars:[100,80,100,80,100,80], wash:[120,100,120,100], strobe:0, laser:20, smoke:20 } },
]
