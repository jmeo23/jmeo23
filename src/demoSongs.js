export const DEMO_SONGS = [
  {
    id: 'basket-case',
    title: 'Basket Case',
    artist: 'Green Day',
    bpm: 170,
    timeSignature: [4, 4],
    key: 'Eb major',
    sections: [
      { id: 'intro',   name: 'Intro',         bars: 4,  dmxScene: 'intro'  },
      { id: 'verse1',  name: 'Verse 1',       bars: 8,  dmxScene: 'verse'  },
      { id: 'chorus1', name: 'Chorus',        bars: 8,  dmxScene: 'chorus' },
      { id: 'verse2',  name: 'Verse 2',       bars: 8,  dmxScene: 'verse'  },
      { id: 'chorus2', name: 'Chorus',        bars: 8,  dmxScene: 'chorus' },
      { id: 'bridge',  name: 'Bridge / Solo', bars: 8,  dmxScene: 'bridge' },
      { id: 'chorus3', name: 'Chorus',        bars: 8,  dmxScene: 'chorus' },
      { id: 'outro',   name: 'Outro',         bars: 4,  dmxScene: 'outro'  },
    ],
    dmxScenes: {
      intro:  { pars:[40,40,40,40,40,40],         wash:[0,0,0,0],           strobe:0,  laser:30,  smoke:20 },
      verse:  { pars:[80,60,80,60,80,60],         wash:[60,60,60,60],       strobe:0,  laser:0,   smoke:0  },
      chorus: { pars:[255,255,255,255,255,255],   wash:[200,200,200,200],   strobe:60, laser:80,  smoke:40 },
      bridge: { pars:[120,0,120,0,120,0],         wash:[100,0,100,0],       strobe:30, laser:120, smoke:0  },
      outro:  { pars:[30,30,30,30,30,30],         wash:[20,20,20,20],       strobe:0,  laser:0,   smoke:10 },
    },
    countInScene: {
      type: 'beat-pulse',
      peak: { pars:[255,255,255,255,255,255], wash:[255,255,255,255], strobe:0, laser:0, smoke:0 },
      base: { pars:[0,0,0,0,0,0],             wash:[0,0,0,0],         strobe:0, laser:0, smoke:0 },
    },
  },
]
