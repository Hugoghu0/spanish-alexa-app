// APL (Alexa Presentation Language) screen: Homie the bot + a speech bubble.
// The bot is drawn with Alexa Vector Graphics, so no image hosting is needed.

const circle = (cx, cy, r) => `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`

export const homieGraphic = {
  type: 'AVG',
  version: '1.2',
  width: 200,
  height: 220,
  items: [
    // antenna
    { type: 'path', pathData: 'M97,24 L103,24 L103,48 L97,48 Z', fill: '#9AA5C4' },
    { type: 'path', pathData: circle(100, 18, 10), fill: '#FF6B5B' },
    { type: 'path', pathData: circle(97, 15, 3), fill: '#FFD1CB' },
    // ears
    { type: 'path', pathData: 'M30,80 Q20,80 20,90 L20,104 Q20,114 30,114 L36,114 L36,80 Z', fill: '#FFB627' },
    { type: 'path', pathData: 'M170,80 Q180,80 180,90 L180,104 Q180,114 170,114 L164,114 L164,80 Z', fill: '#FFB627' },
    // head
    {
      type: 'path',
      pathData: 'M66,46 L134,46 Q166,46 166,78 L166,116 Q166,148 134,148 L66,148 Q34,148 34,116 L34,78 Q34,46 66,46 Z',
      fill: '#2EC4B6',
    },
    // face screen
    {
      type: 'path',
      pathData: 'M72,60 L128,60 Q150,60 150,82 L150,112 Q150,134 128,134 L72,134 Q50,134 50,112 L50,82 Q50,60 72,60 Z',
      fill: '#16213E',
    },
    // eyes
    {
      type: 'group',
      items: [
        { type: 'path', pathData: circle(78, 90, 11), fill: '#7CF7E8' },
        { type: 'path', pathData: circle(122, 90, 11), fill: '#7CF7E8' },
        { type: 'path', pathData: circle(81, 86, 3.5), fill: '#FFFFFF' },
        { type: 'path', pathData: circle(125, 86, 3.5), fill: '#FFFFFF' },
      ],
    },
    // cheeks
    { type: 'path', pathData: circle(62, 114, 6), fill: '#FF8FA3', fillOpacity: 0.8 },
    { type: 'path', pathData: circle(138, 114, 6), fill: '#FF8FA3', fillOpacity: 0.8 },
    // smile
    {
      type: 'path',
      pathData: 'M84,110 Q100,124 116,110',
      fill: 'transparent',
      stroke: '#7CF7E8',
      strokeWidth: 5,
      strokeLineCap: 'round',
    },
    // neck + body
    { type: 'path', pathData: 'M88,148 L112,148 L112,158 L88,158 Z', fill: '#9AA5C4' },
    {
      type: 'path',
      pathData: 'M76,156 L124,156 Q146,156 146,178 L146,206 Q146,214 138,214 L62,214 Q54,214 54,206 L54,178 Q54,156 76,156 Z',
      fill: '#22A699',
    },
    { type: 'path', pathData: circle(100, 184, 11), fill: '#FFD166' },
    { type: 'path', pathData: circle(100, 184, 5), fill: '#FFF3C4' },
  ],
}

export const aplDocument = {
  type: 'APL',
  version: '2023.2',
  theme: 'dark',
  graphics: { homie: homieGraphic },
  mainTemplate: {
    parameters: ['payload'],
    items: [
      {
        type: 'Frame',
        width: '100vw',
        height: '100vh',
        background: {
          type: 'linear',
          colorRange: ['#3A2E7A', '#1B1F4B'],
          inputRange: [0, 1],
          angle: 160,
        },
        items: [
          {
            type: 'Container',
            width: '100%',
            height: '100%',
            direction: "${viewport.width > viewport.height * 1.2 && viewport.shape != 'round' ? 'row' : 'column'}",
            justifyContent: 'center',
            alignItems: 'center',
            paddingLeft: '5vw',
            paddingRight: '5vw',
            items: [
              {
                type: 'VectorGraphic',
                id: 'bot',
                source: 'homie',
                width: "${viewport.shape == 'round' ? '42vh' : (viewport.width > viewport.height * 1.2 ? '62vh' : '38vh')}",
                height: "${viewport.shape == 'round' ? '46vh' : (viewport.width > viewport.height * 1.2 ? '68vh' : '42vh')}",
                scale: 'best-fit',
                onMount: [
                  {
                    type: 'AnimateItem',
                    duration: 1400,
                    repeatCount: 10000,
                    repeatMode: 'reverse',
                    easing: 'ease-in-out',
                    value: [{ property: 'transform', from: [{ translateY: 0 }], to: [{ translateY: -14 }] }],
                  },
                ],
              },
              {
                type: 'Container',
                shrink: 1,
                alignItems: "${viewport.width > viewport.height * 1.2 && viewport.shape != 'round' ? 'start' : 'center'}",
                paddingLeft: "${viewport.width > viewport.height * 1.2 && viewport.shape != 'round' ? '3vw' : '0'}",
                items: [
                  {
                    type: 'Frame',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '36dp',
                    paddingTop: '20dp',
                    paddingBottom: '20dp',
                    paddingLeft: '32dp',
                    paddingRight: '32dp',
                    maxWidth: "${viewport.shape == 'round' ? '80vw' : '52vw'}",
                    items: [
                      {
                        type: 'Text',
                        text: '${payload.homie.mensaje}',
                        color: '#16213E',
                        fontWeight: '800',
                        fontSize: "${viewport.shape == 'round' ? '30dp' : (payload.homie.largo ? '30dp' : '56dp')}",
                        textAlign: "${viewport.width > viewport.height * 1.2 && viewport.shape != 'round' ? 'left' : 'center'}",
                        maxLines: 8,
                      },
                    ],
                  },
                  {
                    type: 'Text',
                    when: "${viewport.shape != 'round'}",
                    text: '${payload.homie.pista}',
                    color: '#C9C3FF',
                    fontSize: '24dp',
                    paddingTop: '18dp',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}

export function aplDirective(mensaje, pista = 'Dime lo que quieras: "quiero saber…", "dime…", "cuéntame…"') {
  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'homie',
    document: aplDocument,
    datasources: { homie: { mensaje, pista, largo: mensaje.length > 60 } },
  }
}
