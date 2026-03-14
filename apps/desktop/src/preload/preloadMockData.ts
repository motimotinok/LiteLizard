import type { FileNode, LiteLizardDocument } from '@litelizard/shared';

export const mockRootPath = '/mock/workspace';

const now = '2026-02-21T00:00:00.000Z';

export const initialMockTree: FileNode[] = [
  {
    path: `${mockRootPath}/pakira.md`,
    name: 'pakira.md',
    type: 'file',
  },
  {
    path: `${mockRootPath}/notes`,
    name: 'notes',
    type: 'directory',
    children: [
      {
        path: `${mockRootPath}/notes/memo.md`,
        name: 'memo.md',
        type: 'file',
      },
    ],
  },
];

export const initialMockDocuments: Record<string, LiteLizardDocument> = {
  [`${mockRootPath}/pakira.md`]: {
    version: 2,
    documentId: 'doc_mock_pakira',
    title: 'pakira',
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'litelizard-json',
      originPath: `${mockRootPath}/pakira.md`,
    },
    chapters: [
      {
        id: 'c_p1',
        order: 1,
        title: '緑の衝動',
      },
      {
        id: 'c_p2',
        order: 2,
        title: '愛情という名の過剰',
      },
      {
        id: 'c_p3',
        order: 3,
        title: '解体と再生',
      },
    ],
    paragraphs: [
      // ── 章1: 緑の衝動 ──
      {
        id: 'p_p01',
        chapterId: 'c_p1',
        order: 1,
        light: {
          text: '朝、ベランダに出ると、パキラの葉がいくつか床に散らばっていた。前の晩に水をやって、室外機の上に置いたままにしていた。夏の盛りで、夜も気温が下がらない頃だった。緑だった葉が半透明に近い黄色になり、乾燥した紙みたいにくたびれていた。',
          charCount: 101,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_p02',
        chapterId: 'c_p1',
        order: 2,
        light: {
          text: '買ったのは大学に入る直前のことで、近所の百均に三店舗入っているコンプレックスビルの植物コーナーで見つけた。パキラ、三百円。育てやすいとネットで読んで選んだ。なぜ育てようと思ったかは今でも曖昧で、孤独だけでも手持ち無沙汰だけでもなかった気がする。ただ、長年育てれば自分の背丈を追い越すと書いてあって、暗い部屋の中に背の高い植物が立っている光景を想像して、なんとなく胸が弾んだ。',
          charCount: 165,
        },
        lizard: {
          status: 'complete',
          emotion: ['期待', '孤独'],
          theme: ['始まり', '衝動'],
          deepMeaning: '孤独の中で何かを育てることで自分の居場所を確認しようとしている。背丈を追い越すという未来の想像が、現在の空虚さを埋める機能を果たしている。',
          confidence: 0.88,
          model: 'mock-model-v1',
          requestId: 'req_mock_p02',
          analyzedAt: now,
        },
      },
      {
        id: 'p_p03',
        chapterId: 'c_p1',
        order: 3,
        light: {
          text: '思えば最初に欲しいと思ったのは、高校の頃に担任の先生の部屋で見た巨大なウンベラータのせいかもしれない。天井に届くほどの高さで、教卓の横に鎮座していて、授業中ずっとそれが目に入った。先生に育て方を聞いたことがある。「水と光だけでいい」と言われた。それを信じすぎた。',
          charCount: 119,
        },
        lizard: {
          status: 'stale',
        },
      },
      // ── 章2: 愛情という名の過剰 ──
      {
        id: 'p_p04',
        chapterId: 'c_p2',
        order: 4,
        light: {
          text: '育て始めたのは七月で、窓から差し込む日差しが滝のように強く降り注いでいた。毎朝水をたっぷり注いで、日当たりの良い窓際に置いて、カーテンを全開にした。天気の特に良い日はベランダの室外機の上に出して、夕方には土が完全に乾くようにした。熱心に植物を育てる人間がいるだろうかと、ひそかにほくそ笑んでいた。',
          charCount: 142,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_p05',
        chapterId: 'c_p2',
        order: 5,
        light: {
          text: 'ある日、葉の縁が鬱血したような赤みがかった黄色になっているのに気づいた。一部だけだったし、成長の過程で起きる一種の変化だろうと考えた。喉に小骨が刺さったような感覚があって、それを意識的に無視した。',
          charCount: 87,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_p06',
        chapterId: 'c_p2',
        order: 6,
        light: {
          text: '三枚ほどが完全に変色してから、異常だと認めざるを得なくなった。栄養不足だと判断して、丸い石ころみたいな肥料を土の表面にばら撒き、液体の栄養剤も注いだ。三日に一回は継ぎ足した。水の量を増やし、一時間おきに霧吹きで葉に水をかけた。早く元に戻るように、と祈り続けながら。',
          charCount: 124,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_p07',
        chapterId: 'c_p2',
        order: 7,
        light: {
          text: '葉の大多数が変色した頃、最初に黄色くなった葉が床に落ちているのを発見した。インターネットで調べると、葉焼けというのが出てきた。日照過多による葉緑素の破壊。「葉焼けした葉は二度と元には戻らない」という一文を読んで、冷たいものがせり上がった。私がやっていたことは、全部逆効果だった。',
          charCount: 127,
        },
        lizard: {
          status: 'complete',
          emotion: ['後悔', '焦り'],
          theme: ['失敗', '誤認'],
          deepMeaning: '善意の行動が一貫して逆効果だったという事実が、主体の自己評価と世界への信頼を同時に揺るがしている。',
          confidence: 0.91,
          model: 'mock-model-v1',
          requestId: 'req_mock_p07',
          analyzedAt: now,
        },
      },
      // ── 章3: 解体と再生 ──
      {
        id: 'p_p08',
        chapterId: 'c_p3',
        order: 8,
        light: {
          text: '捨てることにした。カーテンを閉め切って新聞紙を床に敷き、筆箱から小さなハサミを引っ張り出した。鉢植えを新聞紙の上に置き、枝にハサミを当てて力を込めた。粗末なハサミで刃が通らなかったので、強引に押したり引いたりして枝をむしり取った。断面から緑色の液体が滲み出ていた。幹は刃が立たず、浅い傷を残したまま引き抜いた。新聞紙に包んでゴミ袋に入れ、誰にも見られないように家を出て、誰にも見られないように捨てた。',
          charCount: 182,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_p09',
        chapterId: 'c_p3',
        order: 9,
        light: {
          text: '部屋に戻った時、肩の荷が降りたような感覚があった。同時に、自分の立ち位置が何か変わったような気がした。それまで私は「傷つく側」にいると思っていた。けれどあの時まだ生気のあるパキラの枝をむしり取ったのは、他でもない自分だった。あれは単なる植物だったのだという理屈を何度も心に投げかけたが、一度も返事は返ってこなかった。',
          charCount: 143,
        },
        lizard: {
          status: 'complete',
          emotion: ['内省', '罪悪感'],
          theme: ['加害', 'アイデンティティの揺らぎ'],
          deepMeaning: '「傷つく側」という自己像が崩れ、自分が他者を傷つけうる存在だという認識が初めて具体的な形をとっている。',
          confidence: 0.94,
          model: 'mock-model-v1',
          requestId: 'req_mock_p09',
          analyzedAt: now,
        },
      },
      {
        id: 'p_p10',
        chapterId: 'c_p3',
        order: 10,
        light: {
          text: 'あれからしばらく経って、また観葉植物を育てている。今度はミリオンバンブーにした。水差しに入れて水耕栽培で育てていて、直射日光は当てず、遮光カーテン越しの光だけ当てている。水の交換は週一回と決めた。それで十分だということを、今度はちゃんと知っている。',
          charCount: 112,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_p11',
        chapterId: 'c_p3',
        order: 11,
        light: {
          text: '夏になったら、今度こそ鉢植えに植え替えてやろうと思っている。去年の経験から学んだことが役に立つかどうかは、まだわからない。ただ少なくとも今度は、葉が黄色くなっても正しい原因をすぐに調べると思う。それだけは、あのパキラが教えてくれた。',
          charCount: 107,
        },
        lizard: {
          status: 'stale',
        },
      },
    ],
  },
  [`${mockRootPath}/notes/memo.md`]: {
    version: 2,
    documentId: 'doc_mock_memo',
    title: 'memo',
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'litelizard-json',
      originPath: `${mockRootPath}/notes/memo.md`,
    },
    chapters: [
      {
        id: 'c_m1',
        order: 1,
        title: '書き直し案',
      },
    ],
    paragraphs: [
      {
        id: 'p_m01',
        chapterId: 'c_m1',
        order: 1,
        light: {
          text: 'パキラのエッセイ、もう少し書き直したい。買った理由をもっと具体的に。先生のウンベラータのくだりは残す。',
          charCount: 48,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_m02',
        chapterId: 'c_m1',
        order: 2,
        light: {
          text: '締めをどうするか。「学んだ」で終わると説教っぽくなる気がする。もう少し余韻を残せないか。',
          charCount: 42,
        },
        lizard: {
          status: 'stale',
        },
      },
    ],
  },
};

export const initialMockApiKeyConfigured = true;
