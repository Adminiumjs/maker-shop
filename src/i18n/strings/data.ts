/**
 * The catalogue's words: materials, sizes, finishes, the fourteen pieces, the
 * looking-after notes and the three machines in the unit.
 *
 * `lib/catalogue.ts` holds the numbers and the keys; every display string a
 * shopper reads about a piece is here, so the whole catalogue translates
 * without a millimetre being touched.
 *
 * TRAPS THIS FILE WALKS THROUGH (24 D10b). A shop that sells pots and cake
 * toppers trips the release grep on ordinary craft vocabulary: "plant" and
 * "planter" both contain a banned run, so a pot is a POT and the slate ones are
 * GARDEN MARKERS; a two-layer cake topper is never a tiered one; engraving is
 * part of the price and postage is included, because the other way of saying
 * both is banned outright.
 */

export const data = {
  "en-US": {
    "data.material.walnut.name": "Walnut",
    "data.material.walnut.short": "Walnut",
    "data.material.ply.name": "Birch ply",
    "data.material.ply.short": "Ply",
    "data.material.slate.name": "Slate",
    "data.material.slate.short": "Slate",
    "data.material.acrylic.name": "Acrylic",
    "data.material.acrylic.short": "Acrylic",
    "data.material.resin.name": "Printed resin",
    "data.material.resin.short": "Resin",
    "data.material.stoneware.name": "Stoneware",
    "data.material.stoneware.short": "Stoneware",
    "data.runsOut.walnut": "walnut",
    "data.runsOut.ply": "birch ply",
    "data.runsOut.slate": "slate blanks",
    "data.runsOut.acrylic": "acrylic",
    "data.runsOut.resin": "filament",
    "data.runsOut.stoneware": "glaze",

    "data.category.coasters": "Coasters",
    "data.category.signs": "Signs",
    "data.category.keyrings": "Keyrings",
    "data.category.pots": "Pots",
    "data.category.desk": "Desk pieces",
    "data.category.mugs": "Mugs",

    "data.size.small": "Small",
    "data.size.standard": "Standard",
    "data.size.large": "Large",
    "data.size.tall": "Tall",

    "data.finish.oiled": "Oiled",
    "data.finish.waxed": "Dark wax",
    "data.finish.bare": "Left bare",
    "data.finish.plain-edge": "Plain edge",
    "data.finish.bevelled": "Bevelled edge",
    "data.finish.clear": "Clear",
    "data.finish.amber": "Amber",
    "data.finish.ink": "Ink",
    "data.finish.matte-bone": "Bone",
    "data.finish.matte-sage": "Sage",
    "data.finish.matte-clay": "Clay",
    "data.finish.oatmeal": "Oatmeal",
    "data.finish.seafoam": "Seafoam",
    "data.finish.ink-glaze": "Deep ink",

    "data.unit.each": "each",
    "data.unit.set-of-four": "set of four",
    "data.unit.set-of-six": "set of six",

    "data.product.walnut-coasters.name": "Engraved walnut coasters",
    "data.product.ply-coasters.name": "Birch ply coasters",
    "data.product.house-sign.name": "Slate house sign",
    "data.product.garden-markers.name": "Slate garden markers",
    "data.product.keyring.name": "Acrylic keyring",
    "data.product.pet-tag.name": "Engraved pet tag",
    "data.product.desk-tray.name": "Printed desk tray",
    "data.product.herb-pot.name": "Printed herb pot",
    "data.product.stoneware-mug.name": "Hand-glazed mug",
    "data.product.cake-topper.name": "Two-layer cake topper",
    "data.product.cutting-board.name": "Walnut cutting board",
    "data.product.wedding-sign.name": "Standing wedding sign",
    "data.product.bookmark.name": "Walnut bookmark",
    "data.product.photo-block.name": "Photo block",

    "data.product.walnut-coasters.madeFrom":
      "Cut from 3mm American black walnut and engraved on the laser. Four to a set, cut from one board so the grain runs together.",
    "data.product.ply-coasters.madeFrom":
      "Birch ply, 4mm, with the pale face left showing. The cheerful one, and the one we make most of.",
    "data.product.house-sign.madeFrom":
      "Riven Welsh slate with the quarry's own mottling. Engraved deep enough to read from the gate.",
    "data.product.garden-markers.madeFrom":
      "Slate offcuts cut into stakes for the herb bed. Six to a set, one word each, and they stay put in the wet.",
    "data.product.keyring.madeFrom":
      "3mm cast acrylic, cut and engraved in one pass, with a split ring through the corner.",
    "data.product.pet-tag.madeFrom":
      "The same acrylic, smaller, with the engraving filled so it stays readable against a collar.",
    "data.product.desk-tray.madeFrom":
      "Printed on our own machines in a matte finish, with a soft lip so nothing rolls off.",
    "data.product.herb-pot.madeFrom":
      "A printed pot for the windowsill, with a drainage hole and a saucer that comes with it.",
    "data.product.stoneware-mug.madeFrom":
      "Thrown by Nell in speckled stoneware and fired twice, which is why it takes ten studio days.",
    "data.product.cake-topper.madeFrom":
      "Two layers of walnut, the wording cut through the top one so the layer behind shows through.",
    "data.product.cutting-board.madeFrom":
      "Solid walnut, 18mm, with a juice groove and a rounded edge. Engraved on the back so the face stays a face.",
    "data.product.wedding-sign.madeFrom":
      "A standing sign in 6mm walnut with a wooden foot, engraved with the names and the date.",
    "data.product.bookmark.madeFrom":
      "A thin strip of walnut, oiled until it feels like a stone, engraved along the length.",
    "data.product.photo-block.madeFrom":
      "Your picture printed onto birch ply and sealed, in a block that stands on its own edge.",

    "data.finishedBy.walnut": "Sanded to 320 and finished with a hard wax oil we mix ourselves.",
    "data.finishedBy.ply": "Sanded and left bare, or oiled if you ask — the ply likes being left alone.",
    "data.finishedBy.slate": "Edges eased by hand; the face is the face the quarry split.",
    "data.finishedBy.acrylic": "Flame-polished on the cut edge so it reads as glass rather than as a cut.",
    "data.finishedBy.resin": "Printed in a matte finish and the seam taken off by hand.",
    "data.finishedBy.stoneware": "Glazed inside and out, then fired a second time to set it.",

    "data.careSummary.walnut": "Wipe it, oil it once a year, and keep it out of the dishwasher.",
    "data.careSummary.ply": "Wipe it dry. Ply and standing water are not friends.",
    "data.careSummary.slate": "Rinse it. It has been outside for four hundred million years already.",
    "data.careSummary.acrylic": "Warm water and a soft cloth, never anything with solvent in it.",
    "data.careSummary.resin": "Wash it by hand and keep it off a hot windowsill in July.",
    "data.careSummary.stoneware": "Dishwasher and microwave are both fine. It was fired at 1240°C.",

    "data.personalHint.engraved-wood":
      "Tell us the name and the date. We set it in the lettering shown in the pictures — if you want something else, say so and we'll reply before we cut.",
    "data.personalHint.engraved-slate":
      "House name or number, whichever you use. Slate takes short words best, so we'll write back if it is going to crowd.",
    "data.personalHint.engraved-acrylic":
      "One short word or a name. Anything longer gets small quickly on a piece this size.",
    "data.personalHint.painted-glaze":
      "Nell paints this on before the second firing, so it goes under the glaze and stays there. Keep it short.",
    "data.personalHint.markers":
      "One word a marker, separated by commas — we'll cut one stake for each. Six to a set.",

    "data.care.walnut.title": "Walnut",
    "data.care.walnut.l1": "Wipe it with a damp cloth and dry it straight after.",
    "data.care.walnut.l2": "Once a year, a little oil on a rag brings the colour back.",
    "data.care.walnut.l3": "Never the dishwasher. The heat lifts the grain and the oil goes.",
    "data.care.ply.title": "Birch ply",
    "data.care.ply.l1": "Dry it properly — ply drinks, and standing water lifts the layers.",
    "data.care.ply.l2": "Left bare it will darken a little with handling, which we like.",
    "data.care.ply.l3": "A wax polish once in a while, if you want it shinier than it came.",
    "data.care.slate.title": "Slate",
    "data.care.slate.l1": "Rinse it under a tap and let it dry. That is the whole job.",
    "data.care.slate.l2": "Outdoors it will go paler in the sun and come back in the rain.",
    "data.care.slate.l3": "The engraving is cut in, not painted, so it cannot wear off.",
    "data.care.acrylic.title": "Acrylic",
    "data.care.acrylic.l1": "Warm water, a drop of soap, a soft cloth.",
    "data.care.acrylic.l2": "Nothing with solvent in it — it clouds the surface for good.",
    "data.care.acrylic.l3": "Keep it off a radiator. It is a sheet, and sheets bow.",
    "data.care.resin.title": "Printed resin",
    "data.care.resin.l1": "Wash it by hand in warm water.",
    "data.care.resin.l2": "Not the dishwasher and not the microwave.",
    "data.care.resin.l3": "A south-facing windowsill in July will soften it. Ask us how we know.",
    "data.care.stoneware.title": "Stoneware",
    "data.care.stoneware.l1": "Dishwasher, microwave and oven to 180°C are all fine.",
    "data.care.stoneware.l2": "The unglazed foot ring can mark a table — a felt pad sorts it.",
    "data.care.stoneware.l3": "The speckles are iron in the clay coming through. They are meant to be there.",

    "data.machine.laser.name": "The laser cutter",
    "data.machine.laser.what":
      "Cuts and engraves the wood, the ply, the acrylic and the slate. It does most of what we sell.",
    "data.machine.printers.name": "Two small printers",
    "data.machine.printers.what":
      "The trays, the pots and anything with a curve. They run overnight and we empty them in the morning.",
    "data.machine.kiln.name": "A small glaze kiln",
    "data.machine.kiln.what":
      "Nell's. Everything thrown goes through it twice — once bare, once glazed — which is the ten days.",

    "data.angle.front": "FRONT",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "TOP",
    "data.angle.detail": "DETAIL",
  },

  "de-DE": {
    "data.material.walnut.name": "Nussbaum",
    "data.material.walnut.short": "Nussbaum",
    "data.material.ply.name": "Birkensperrholz",
    "data.material.ply.short": "Sperrholz",
    "data.material.slate.name": "Schiefer",
    "data.material.slate.short": "Schiefer",
    "data.material.acrylic.name": "Acryl",
    "data.material.acrylic.short": "Acryl",
    "data.material.resin.name": "Gedrucktes Harz",
    "data.material.resin.short": "Harz",
    "data.material.stoneware.name": "Steinzeug",
    "data.material.stoneware.short": "Steinzeug",
    "data.runsOut.walnut": "Nussbaum",
    "data.runsOut.ply": "Birkensperrholz",
    "data.runsOut.slate": "Schieferrohlinge",
    "data.runsOut.acrylic": "Acryl",
    "data.runsOut.resin": "Filament",
    "data.runsOut.stoneware": "Glasur",

    "data.category.coasters": "Untersetzer",
    "data.category.signs": "Schilder",
    "data.category.keyrings": "Schlüsselanhänger",
    "data.category.pots": "Töpfe",
    "data.category.desk": "Für den Schreibtisch",
    "data.category.mugs": "Becher",

    "data.size.small": "Klein",
    "data.size.standard": "Standard",
    "data.size.large": "Groß",
    "data.size.tall": "Hoch",

    "data.finish.oiled": "Geölt",
    "data.finish.waxed": "Dunkles Wachs",
    "data.finish.bare": "Roh belassen",
    "data.finish.plain-edge": "Glatte Kante",
    "data.finish.bevelled": "Angefaste Kante",
    "data.finish.clear": "Klar",
    "data.finish.amber": "Bernstein",
    "data.finish.ink": "Tinte",
    "data.finish.matte-bone": "Knochen",
    "data.finish.matte-sage": "Salbei",
    "data.finish.matte-clay": "Ton",
    "data.finish.oatmeal": "Hafer",
    "data.finish.seafoam": "Meerschaum",
    "data.finish.ink-glaze": "Tiefes Tintenblau",

    "data.unit.each": "je Stück",
    "data.unit.set-of-four": "Satz zu viert",
    "data.unit.set-of-six": "Satz zu sechst",

    "data.product.walnut-coasters.name": "Gravierte Nussbaum-Untersetzer",
    "data.product.ply-coasters.name": "Untersetzer aus Birkensperrholz",
    "data.product.house-sign.name": "Hausschild aus Schiefer",
    "data.product.garden-markers.name": "Gartenstecker aus Schiefer",
    "data.product.keyring.name": "Schlüsselanhänger aus Acryl",
    "data.product.pet-tag.name": "Gravierte Halsbandmarke",
    "data.product.desk-tray.name": "Gedruckte Schreibtischschale",
    "data.product.herb-pot.name": "Gedruckter Kräutertopf",
    "data.product.stoneware-mug.name": "Handglasierter Becher",
    "data.product.cake-topper.name": "Zweilagiger Tortenaufsatz",
    "data.product.cutting-board.name": "Schneidebrett aus Nussbaum",
    "data.product.wedding-sign.name": "Stehendes Hochzeitsschild",
    "data.product.bookmark.name": "Lesezeichen aus Nussbaum",
    "data.product.photo-block.name": "Fotoblock",

    "data.product.walnut-coasters.madeFrom":
      "Aus 3 mm amerikanischem Nussbaum geschnitten und auf dem Laser graviert. Vier im Satz, aus einem Brett, damit die Maserung zusammenläuft.",
    "data.product.ply-coasters.madeFrom":
      "Birkensperrholz, 4 mm, mit der hellen Seite nach oben. Der fröhliche, und der, den wir am häufigsten machen.",
    "data.product.house-sign.madeFrom":
      "Gespaltener walisischer Schiefer mit der Zeichnung des Bruchs. Tief genug graviert, um vom Tor aus lesbar zu sein.",
    "data.product.garden-markers.madeFrom":
      "Schieferreste, zu Steckern geschnitten, für das Kräuterbeet. Sechs im Satz, je ein Wort, und sie halten auch im Nassen.",
    "data.product.keyring.madeFrom":
      "3 mm Gussacryl, in einem Durchgang geschnitten und graviert, mit einem Schlüsselring in der Ecke.",
    "data.product.pet-tag.madeFrom":
      "Dasselbe Acryl, kleiner, mit gefüllter Gravur, damit sie am Halsband lesbar bleibt.",
    "data.product.desk-tray.madeFrom":
      "Auf unseren eigenen Maschinen matt gedruckt, mit weicher Kante, damit nichts herunterrollt.",
    "data.product.herb-pot.madeFrom":
      "Ein gedruckter Topf für die Fensterbank, mit Abzugsloch und passendem Untersetzer.",
    "data.product.stoneware-mug.madeFrom":
      "Von Nell aus gesprenkeltem Steinzeug gedreht und zweimal gebrannt — deshalb dauert er zehn Werkstatttage.",
    "data.product.cake-topper.madeFrom":
      "Zwei Lagen Nussbaum, die Schrift durch die obere geschnitten, sodass die Lage dahinter durchscheint.",
    "data.product.cutting-board.madeFrom":
      "Massiver Nussbaum, 18 mm, mit Saftrille und gerundeter Kante. Auf der Rückseite graviert, damit die Fläche eine Fläche bleibt.",
    "data.product.wedding-sign.madeFrom":
      "Ein stehendes Schild aus 6 mm Nussbaum mit Holzfuß, graviert mit den Namen und dem Datum.",
    "data.product.bookmark.madeFrom":
      "Ein dünner Streifen Nussbaum, so lange geölt, bis er sich wie ein Kiesel anfühlt, längs graviert.",
    "data.product.photo-block.madeFrom":
      "Dein Bild auf Birkensperrholz gedruckt und versiegelt, als Block, der auf der eigenen Kante steht.",

    "data.finishedBy.walnut": "Bis Körnung 320 geschliffen und mit einem Hartwachsöl behandelt, das wir selbst anrühren.",
    "data.finishedBy.ply": "Geschliffen und roh belassen, auf Wunsch geölt — Sperrholz mag es, in Ruhe gelassen zu werden.",
    "data.finishedBy.slate": "Kanten von Hand gebrochen; die Fläche ist die, die der Bruch gespalten hat.",
    "data.finishedBy.acrylic": "Die Schnittkante ist flammpoliert, damit sie wie Glas wirkt und nicht wie ein Schnitt.",
    "data.finishedBy.resin": "Matt gedruckt, die Naht von Hand abgenommen.",
    "data.finishedBy.stoneware": "Innen und außen glasiert und dann ein zweites Mal gebrannt.",

    "data.careSummary.walnut": "Abwischen, einmal im Jahr ölen und nicht in die Spülmaschine.",
    "data.careSummary.ply": "Trocken wischen. Sperrholz und stehendes Wasser vertragen sich nicht.",
    "data.careSummary.slate": "Abspülen. Er liegt seit vierhundert Millionen Jahren draußen.",
    "data.careSummary.acrylic": "Warmes Wasser und ein weiches Tuch, nie etwas mit Lösungsmittel.",
    "data.careSummary.resin": "Von Hand spülen und im Juli nicht auf die heiße Fensterbank stellen.",
    "data.careSummary.stoneware": "Spülmaschine und Mikrowelle sind beide in Ordnung. Gebrannt bei 1240 °C.",

    "data.personalHint.engraved-wood":
      "Sag uns den Namen und das Datum. Wir setzen es in der Schrift, die auf den Bildern zu sehen ist — wenn du etwas anderes willst, schreib es dazu, wir melden uns vor dem Schneiden.",
    "data.personalHint.engraved-slate":
      "Hausname oder Nummer, was immer ihr benutzt. Schiefer verträgt kurze Wörter am besten, und wir schreiben zurück, wenn es eng wird.",
    "data.personalHint.engraved-acrylic":
      "Ein kurzes Wort oder ein Name. Alles Längere wird auf einem so kleinen Stück schnell winzig.",
    "data.personalHint.painted-glaze":
      "Nell malt das vor dem zweiten Brand auf, es liegt also unter der Glasur und bleibt dort. Halte es kurz.",
    "data.personalHint.markers":
      "Ein Wort je Stecker, durch Kommas getrennt — wir schneiden für jedes einen. Sechs im Satz.",

    "data.care.walnut.title": "Nussbaum",
    "data.care.walnut.l1": "Mit einem feuchten Tuch abwischen und gleich trocken nachwischen.",
    "data.care.walnut.l2": "Einmal im Jahr etwas Öl auf einem Lappen holt die Farbe zurück.",
    "data.care.walnut.l3": "Nie in die Spülmaschine. Die Hitze stellt die Maserung auf und das Öl ist weg.",
    "data.care.ply.title": "Birkensperrholz",
    "data.care.ply.l1": "Richtig trocknen — Sperrholz saugt, und stehendes Wasser hebt die Lagen an.",
    "data.care.ply.l2": "Roh belassen wird es durch das Anfassen etwas dunkler, was uns gefällt.",
    "data.care.ply.l3": "Ab und zu eine Wachspolitur, wenn du es glänzender willst, als es kam.",
    "data.care.slate.title": "Schiefer",
    "data.care.slate.l1": "Unter dem Wasserhahn abspülen und trocknen lassen. Mehr ist es nicht.",
    "data.care.slate.l2": "Draußen wird er in der Sonne blasser und kommt im Regen zurück.",
    "data.care.slate.l3": "Die Gravur ist eingeschnitten, nicht aufgemalt, sie kann also nicht abgehen.",
    "data.care.acrylic.title": "Acryl",
    "data.care.acrylic.l1": "Warmes Wasser, ein Tropfen Spülmittel, ein weiches Tuch.",
    "data.care.acrylic.l2": "Nichts mit Lösungsmittel — das trübt die Oberfläche endgültig.",
    "data.care.acrylic.l3": "Nicht auf die Heizung legen. Es ist eine Platte, und Platten werfen sich.",
    "data.care.resin.title": "Gedrucktes Harz",
    "data.care.resin.l1": "Von Hand in warmem Wasser spülen.",
    "data.care.resin.l2": "Nicht in die Spülmaschine und nicht in die Mikrowelle.",
    "data.care.resin.l3": "Eine Südfensterbank im Juli macht es weich. Frag uns, woher wir das wissen.",
    "data.care.stoneware.title": "Steinzeug",
    "data.care.stoneware.l1": "Spülmaschine, Mikrowelle und Ofen bis 180 °C sind alle in Ordnung.",
    "data.care.stoneware.l2": "Der unglasierte Fußring kann einen Tisch markieren — ein Filzplättchen löst das.",
    "data.care.stoneware.l3": "Die Sprenkel sind Eisen im Ton, das durchkommt. Die gehören dazu.",

    "data.machine.laser.name": "Der Laserschneider",
    "data.machine.laser.what":
      "Schneidet und graviert Holz, Sperrholz, Acryl und Schiefer. Er macht das meiste von dem, was wir verkaufen.",
    "data.machine.printers.name": "Zwei kleine Drucker",
    "data.machine.printers.what":
      "Die Schalen, die Töpfe und alles mit einer Rundung. Sie laufen nachts, morgens räumen wir sie aus.",
    "data.machine.kiln.name": "Ein kleiner Glasurofen",
    "data.machine.kiln.what":
      "Nells Ofen. Alles Gedrehte geht zweimal hindurch — einmal roh, einmal glasiert — das sind die zehn Tage.",

    "data.angle.front": "VORNE",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "OBEN",
    "data.angle.detail": "DETAIL",
  },

  "fr-FR": {
    "data.material.walnut.name": "Noyer",
    "data.material.walnut.short": "Noyer",
    "data.material.ply.name": "Contreplaqué de bouleau",
    "data.material.ply.short": "Contreplaqué",
    "data.material.slate.name": "Ardoise",
    "data.material.slate.short": "Ardoise",
    "data.material.acrylic.name": "Acrylique",
    "data.material.acrylic.short": "Acrylique",
    "data.material.resin.name": "Résine imprimée",
    "data.material.resin.short": "Résine",
    "data.material.stoneware.name": "Grès",
    "data.material.stoneware.short": "Grès",
    "data.runsOut.walnut": "du noyer",
    "data.runsOut.ply": "du contreplaqué",
    "data.runsOut.slate": "des ardoises brutes",
    "data.runsOut.acrylic": "de l'acrylique",
    "data.runsOut.resin": "du filament",
    "data.runsOut.stoneware": "de l'émail",

    "data.category.coasters": "Dessous de verre",
    "data.category.signs": "Panneaux",
    "data.category.keyrings": "Porte-clés",
    "data.category.pots": "Pots",
    "data.category.desk": "Pour le bureau",
    "data.category.mugs": "Tasses",

    "data.size.small": "Petit",
    "data.size.standard": "Standard",
    "data.size.large": "Grand",
    "data.size.tall": "Haut",

    "data.finish.oiled": "Huilé",
    "data.finish.waxed": "Cire foncée",
    "data.finish.bare": "Laissé brut",
    "data.finish.plain-edge": "Bord droit",
    "data.finish.bevelled": "Bord biseauté",
    "data.finish.clear": "Transparent",
    "data.finish.amber": "Ambre",
    "data.finish.ink": "Encre",
    "data.finish.matte-bone": "Os",
    "data.finish.matte-sage": "Sauge",
    "data.finish.matte-clay": "Argile",
    "data.finish.oatmeal": "Avoine",
    "data.finish.seafoam": "Écume",
    "data.finish.ink-glaze": "Encre profonde",

    "data.unit.each": "à l'unité",
    "data.unit.set-of-four": "lot de quatre",
    "data.unit.set-of-six": "lot de six",

    "data.product.walnut-coasters.name": "Dessous de verre en noyer gravé",
    "data.product.ply-coasters.name": "Dessous de verre en contreplaqué",
    "data.product.house-sign.name": "Plaque de maison en ardoise",
    "data.product.garden-markers.name": "Étiquettes de jardin en ardoise",
    "data.product.keyring.name": "Porte-clés en acrylique",
    "data.product.pet-tag.name": "Médaille gravée pour animal",
    "data.product.desk-tray.name": "Vide-poche imprimé",
    "data.product.herb-pot.name": "Pot à herbes imprimé",
    "data.product.stoneware-mug.name": "Tasse émaillée à la main",
    "data.product.cake-topper.name": "Décor de gâteau à deux couches",
    "data.product.cutting-board.name": "Billot à découper en noyer",
    "data.product.wedding-sign.name": "Panneau de mariage sur pied",
    "data.product.bookmark.name": "Marque-page en noyer",
    "data.product.photo-block.name": "Bloc photo",

    "data.product.walnut-coasters.madeFrom":
      "Découpés dans du noyer noir de 3 mm et gravés au laser. Quatre par lot, tirés d'une même pièce pour que le fil se suive.",
    "data.product.ply-coasters.madeFrom":
      "Contreplaqué de bouleau, 4 mm, face claire visible. Le gai, et celui que nous faisons le plus.",
    "data.product.house-sign.madeFrom":
      "Ardoise fendue, avec les marbrures de la carrière. Gravée assez profond pour se lire depuis le portail.",
    "data.product.garden-markers.madeFrom":
      "Chutes d'ardoise taillées en piquets pour le carré d'aromatiques. Six par lot, un mot chacune, et elles tiennent sous la pluie.",
    "data.product.keyring.madeFrom":
      "Acrylique coulé de 3 mm, découpé et gravé d'un seul passage, avec un anneau brisé dans l'angle.",
    "data.product.pet-tag.madeFrom":
      "Le même acrylique, en plus petit, gravure remplie pour rester lisible contre un collier.",
    "data.product.desk-tray.madeFrom":
      "Imprimé sur nos machines en finition mate, avec un rebord souple pour que rien ne roule.",
    "data.product.herb-pot.madeFrom":
      "Un pot imprimé pour le rebord de fenêtre, avec un trou de drainage et sa soucoupe.",
    "data.product.stoneware-mug.madeFrom":
      "Tournée par Nell en grès moucheté et cuite deux fois — d'où les dix jours d'atelier.",
    "data.product.cake-topper.madeFrom":
      "Deux couches de noyer, le texte découpé dans celle du dessus pour laisser voir celle du dessous.",
    "data.product.cutting-board.madeFrom":
      "Noyer massif de 18 mm, rainure à jus et arête arrondie. Gravé au dos pour que la face reste une face.",
    "data.product.wedding-sign.madeFrom":
      "Un panneau sur pied en noyer de 6 mm avec socle en bois, gravé des prénoms et de la date.",
    "data.product.bookmark.madeFrom":
      "Une fine lame de noyer, huilée jusqu'à ce qu'elle ait le toucher d'un galet, gravée dans la longueur.",
    "data.product.photo-block.madeFrom":
      "Votre image imprimée sur contreplaqué de bouleau et vernie, en bloc qui tient sur sa tranche.",

    "data.finishedBy.walnut": "Poncé au grain 320 et fini à l'huile-cire dure que nous mélangeons nous-mêmes.",
    "data.finishedBy.ply": "Poncé et laissé brut, ou huilé si vous le demandez — le contreplaqué aime qu'on le laisse tranquille.",
    "data.finishedBy.slate": "Arêtes cassées à la main ; la face est celle que la carrière a fendue.",
    "data.finishedBy.acrylic": "Chant poli à la flamme pour qu'il se lise comme du verre et non comme une coupe.",
    "data.finishedBy.resin": "Imprimé en finition mate, la couture reprise à la main.",
    "data.finishedBy.stoneware": "Émaillée dedans et dehors, puis cuite une seconde fois pour la fixer.",

    "data.careSummary.walnut": "Essuyez-le, huilez-le une fois l'an, et pas de lave-vaisselle.",
    "data.careSummary.ply": "Essuyez-le sec. Le contreplaqué et l'eau qui stagne ne s'entendent pas.",
    "data.careSummary.slate": "Rincez-la. Elle est dehors depuis quatre cents millions d'années.",
    "data.careSummary.acrylic": "Eau tiède et chiffon doux, jamais rien qui contienne du solvant.",
    "data.careSummary.resin": "Lavez à la main et évitez le rebord de fenêtre brûlant de juillet.",
    "data.careSummary.stoneware": "Lave-vaisselle et micro-ondes, sans souci. Cuite à 1240 °C.",

    "data.personalHint.engraved-wood":
      "Donnez-nous le prénom et la date. Nous les composons dans le lettrage des images — si vous voulez autre chose, dites-le et nous répondrons avant de couper.",
    "data.personalHint.engraved-slate":
      "Nom de maison ou numéro, comme vous voulez. L'ardoise préfère les mots courts, et nous écrivons si cela devient serré.",
    "data.personalHint.engraved-acrylic":
      "Un mot court ou un prénom. Plus long, cela devient vite minuscule sur une pièce de cette taille.",
    "data.personalHint.painted-glaze":
      "Nell le peint avant la deuxième cuisson : cela passe sous l'émail et y reste. Faites court.",
    "data.personalHint.markers":
      "Un mot par étiquette, séparés par des virgules — nous en taillons une pour chacun. Six par lot.",

    "data.care.walnut.title": "Noyer",
    "data.care.walnut.l1": "Essuyez avec un linge humide, puis séchez tout de suite.",
    "data.care.walnut.l2": "Une fois l'an, un peu d'huile sur un chiffon ramène la couleur.",
    "data.care.walnut.l3": "Jamais au lave-vaisselle. La chaleur relève le fil et emporte l'huile.",
    "data.care.ply.title": "Contreplaqué de bouleau",
    "data.care.ply.l1": "Séchez-le bien — le contreplaqué boit, et l'eau qui stagne soulève les plis.",
    "data.care.ply.l2": "Laissé brut, il fonce un peu à l'usage, et cela nous plaît.",
    "data.care.ply.l3": "Un peu de cire de temps en temps, si vous le voulez plus brillant qu'à l'arrivée.",
    "data.care.slate.title": "Ardoise",
    "data.care.slate.l1": "Passez-la sous le robinet et laissez sécher. C'est tout.",
    "data.care.slate.l2": "Dehors, elle pâlit au soleil et revient sous la pluie.",
    "data.care.slate.l3": "La gravure est creusée, pas peinte : elle ne peut pas s'effacer.",
    "data.care.acrylic.title": "Acrylique",
    "data.care.acrylic.l1": "Eau tiède, une goutte de savon, un chiffon doux.",
    "data.care.acrylic.l2": "Rien qui contienne du solvant — cela voile la surface pour de bon.",
    "data.care.acrylic.l3": "Loin du radiateur. C'est une plaque, et les plaques gondolent.",
    "data.care.resin.title": "Résine imprimée",
    "data.care.resin.l1": "Lavez à la main, à l'eau tiède.",
    "data.care.resin.l2": "Ni lave-vaisselle, ni micro-ondes.",
    "data.care.resin.l3": "Un rebord plein sud en juillet la ramollit. Demandez-nous comment nous le savons.",
    "data.care.stoneware.title": "Grès",
    "data.care.stoneware.l1": "Lave-vaisselle, micro-ondes et four jusqu'à 180 °C, sans souci.",
    "data.care.stoneware.l2": "Le pied non émaillé peut marquer une table — un patin de feutre règle cela.",
    "data.care.stoneware.l3": "Les mouchetures sont le fer de l'argile qui ressort. Elles sont voulues.",

    "data.machine.laser.name": "La découpe laser",
    "data.machine.laser.what":
      "Découpe et grave le bois, le contreplaqué, l'acrylique et l'ardoise. Elle fait l'essentiel de ce que nous vendons.",
    "data.machine.printers.name": "Deux petites imprimantes",
    "data.machine.printers.what":
      "Les vide-poches, les pots et tout ce qui a une courbe. Elles tournent la nuit et nous les vidons au matin.",
    "data.machine.kiln.name": "Un petit four à émail",
    "data.machine.kiln.what":
      "Celui de Nell. Tout ce qui est tourné y passe deux fois — nu, puis émaillé — et voilà les dix jours.",

    "data.angle.front": "FACE",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "DESSUS",
    "data.angle.detail": "DÉTAIL",
  },

  "cs-CZ": {
    "data.material.walnut.name": "Ořech",
    "data.material.walnut.short": "Ořech",
    "data.material.ply.name": "Březová překližka",
    "data.material.ply.short": "Překližka",
    "data.material.slate.name": "Břidlice",
    "data.material.slate.short": "Břidlice",
    "data.material.acrylic.name": "Akrylát",
    "data.material.acrylic.short": "Akrylát",
    "data.material.resin.name": "Tištěná pryskyřice",
    "data.material.resin.short": "Pryskyřice",
    "data.material.stoneware.name": "Kamenina",
    "data.material.stoneware.short": "Kamenina",
    "data.runsOut.walnut": "ořech",
    "data.runsOut.ply": "překližku",
    "data.runsOut.slate": "břidlicové polotovary",
    "data.runsOut.acrylic": "akrylát",
    "data.runsOut.resin": "filament",
    "data.runsOut.stoneware": "glazuru",

    "data.category.coasters": "Tácky",
    "data.category.signs": "Cedule",
    "data.category.keyrings": "Přívěsky na klíče",
    "data.category.pots": "Květináče",
    "data.category.desk": "Na stůl",
    "data.category.mugs": "Hrnky",

    "data.size.small": "Malý",
    "data.size.standard": "Základní",
    "data.size.large": "Velký",
    "data.size.tall": "Vysoký",

    "data.finish.oiled": "Olejovaný",
    "data.finish.waxed": "Tmavý vosk",
    "data.finish.bare": "Ponechaný surový",
    "data.finish.plain-edge": "Rovná hrana",
    "data.finish.bevelled": "Zkosená hrana",
    "data.finish.clear": "Čirý",
    "data.finish.amber": "Jantarový",
    "data.finish.ink": "Inkoustový",
    "data.finish.matte-bone": "Kostěná",
    "data.finish.matte-sage": "Šalvějová",
    "data.finish.matte-clay": "Hliněná",
    "data.finish.oatmeal": "Ovesná",
    "data.finish.seafoam": "Mořská pěna",
    "data.finish.ink-glaze": "Hluboká inkoustová",

    "data.unit.each": "za kus",
    "data.unit.set-of-four": "sada čtyř",
    "data.unit.set-of-six": "sada šesti",

    "data.product.walnut-coasters.name": "Gravírované ořechové tácky",
    "data.product.ply-coasters.name": "Tácky z březové překližky",
    "data.product.house-sign.name": "Břidlicová domovní cedule",
    "data.product.garden-markers.name": "Břidlicové zahradní jmenovky",
    "data.product.keyring.name": "Akrylátový přívěsek",
    "data.product.pet-tag.name": "Gravírovaná známka na obojek",
    "data.product.desk-tray.name": "Tištěná miska na stůl",
    "data.product.herb-pot.name": "Tištěný květináč na bylinky",
    "data.product.stoneware-mug.name": "Ručně glazovaný hrnek",
    "data.product.cake-topper.name": "Dvouvrstvý dortový nápis",
    "data.product.cutting-board.name": "Ořechové prkénko",
    "data.product.wedding-sign.name": "Stojící svatební cedule",
    "data.product.bookmark.name": "Ořechová záložka",
    "data.product.photo-block.name": "Fotoblok",

    "data.product.walnut-coasters.madeFrom":
      "Vyříznuté z 3mm amerického ořechu a vygravírované laserem. Čtyři v sadě, z jedné desky, aby kresba dřeva navazovala.",
    "data.product.ply-coasters.madeFrom":
      "Březová překližka, 4 mm, se světlou stranou navrch. Veselý kousek a ten, kterého děláme nejvíc.",
    "data.product.house-sign.madeFrom":
      "Štípaná velšská břidlice s vlastní kresbou lomu. Vygravírovaná dost hluboko, aby se dala přečíst od branky.",
    "data.product.garden-markers.madeFrom":
      "Odřezky břidlice nařezané na kolíky k bylinkám. Šest v sadě, na každé jedno slovo, a drží i v mokru.",
    "data.product.keyring.madeFrom":
      "3mm litý akrylát, vyříznutý a vygravírovaný jedním průchodem, s kroužkem v rohu.",
    "data.product.pet-tag.madeFrom":
      "Tentýž akrylát, menší, s vyplněnou gravurou, aby zůstala čitelná proti obojku.",
    "data.product.desk-tray.madeFrom":
      "Vytištěná na našich strojích v matném provedení, s měkkým okrajem, aby nic nesjelo.",
    "data.product.herb-pot.madeFrom":
      "Tištěný květináč na okenní parapet, s odtokovým otvorem a miskou, která k němu patří.",
    "data.product.stoneware-mug.madeFrom":
      "Vytočený Nell z kropenaté kameniny a vypálený dvakrát — proto trvá deset dílenských dnů.",
    "data.product.cake-topper.madeFrom":
      "Dvě vrstvy ořechu, nápis prořezaný horní vrstvou, aby prosvítala ta zadní.",
    "data.product.cutting-board.madeFrom":
      "Masivní ořech, 18 mm, s drážkou na šťávu a zaoblenou hranou. Gravura je vzadu, aby plocha zůstala plochou.",
    "data.product.wedding-sign.madeFrom":
      "Stojící cedule z 6mm ořechu s dřevěnou nožkou, vygravírovaná jmény a datem.",
    "data.product.bookmark.madeFrom":
      "Tenký proužek ořechu, naolejovaný tak dlouho, až je hladký jako oblázek, gravírovaný po délce.",
    "data.product.photo-block.madeFrom":
      "Váš obrázek vytištěný na březovou překližku a zalakovaný, v bloku, který stojí na vlastní hraně.",

    "data.finishedBy.walnut": "Broušeno do zrnitosti 320 a dokončeno tvrdým voskovým olejem, který si mícháme sami.",
    "data.finishedBy.ply": "Obroušeno a ponecháno surové, nebo naolejované, když si řeknete — překližka má ráda klid.",
    "data.finishedBy.slate": "Hrany srazené ručně; plocha je ta, kterou rozštípl lom.",
    "data.finishedBy.acrylic": "Řezná hrana je leštěná plamenem, aby působila jako sklo, ne jako řez.",
    "data.finishedBy.resin": "Vytištěno matně, šev sebraný ručně.",
    "data.finishedBy.stoneware": "Glazováno zevnitř i zvenku a pak vypáleno podruhé, aby to drželo.",

    "data.careSummary.walnut": "Otřít, jednou za rok naolejovat a do myčky ne.",
    "data.careSummary.ply": "Utřít dosucha. Překližka a stojatá voda si nesedí.",
    "data.careSummary.slate": "Opláchnout. Venku leží už čtyři sta milionů let.",
    "data.careSummary.acrylic": "Vlažná voda a měkký hadřík, nikdy nic s rozpouštědlem.",
    "data.careSummary.resin": "Mýt v ruce a v červenci nenechávat na rozpáleném parapetu.",
    "data.careSummary.stoneware": "Myčka i mikrovlnka jsou v pořádku. Pálí se na 1240 °C.",

    "data.personalHint.engraved-wood":
      "Napište nám jméno a datum. Vysázíme to písmem, které vidíte na obrázcích — když chcete jiné, řekněte, ozveme se dřív, než začneme řezat.",
    "data.personalHint.engraved-slate":
      "Jméno domu nebo číslo, co používáte. Břidlici svědčí krátká slova, a když by to bylo natěsno, napíšeme.",
    "data.personalHint.engraved-acrylic":
      "Jedno krátké slovo nebo jméno. Delší text se na kousku téhle velikosti rychle zmenší.",
    "data.personalHint.painted-glaze":
      "Nell to maluje před druhým výpalem, takže je to pod glazurou a zůstane tam. Držte to krátké.",
    "data.personalHint.markers":
      "Jedno slovo na jmenovku, oddělená čárkami — z každého vyřežeme jeden kolík. Šest v sadě.",

    "data.care.walnut.title": "Ořech",
    "data.care.walnut.l1": "Otřete vlhkým hadříkem a hned dosucha.",
    "data.care.walnut.l2": "Jednou za rok trocha oleje na hadru vrátí barvu.",
    "data.care.walnut.l3": "Nikdy do myčky. Horko zvedne kresbu dřeva a olej je pryč.",
    "data.care.ply.title": "Březová překližka",
    "data.care.ply.l1": "Pořádně vysušte — překližka pije a stojatá voda zvedá vrstvy.",
    "data.care.ply.l2": "Ponechaná surová trochu ztmavne, jak se s ní zachází, a to se nám líbí.",
    "data.care.ply.l3": "Občas voskovou pastu, když ji chcete lesklejší, než přišla.",
    "data.care.slate.title": "Břidlice",
    "data.care.slate.l1": "Opláchněte pod kohoutkem a nechte oschnout. To je celé.",
    "data.care.slate.l2": "Venku na slunci vybledne a v dešti se vrátí.",
    "data.care.slate.l3": "Gravura je vyřezaná, ne namalovaná, takže se nemůže setřít.",
    "data.care.acrylic.title": "Akrylát",
    "data.care.acrylic.l1": "Vlažná voda, kapka mýdla, měkký hadřík.",
    "data.care.acrylic.l2": "Nic s rozpouštědlem — zakalí to povrch natrvalo.",
    "data.care.acrylic.l3": "Ne na topení. Je to deska a desky se kroutí.",
    "data.care.resin.title": "Tištěná pryskyřice",
    "data.care.resin.l1": "Myjte v ruce ve vlažné vodě.",
    "data.care.resin.l2": "Ne do myčky a ne do mikrovlnky.",
    "data.care.resin.l3": "Jižní parapet v červenci ji změkne. Zeptejte se, odkud to víme.",
    "data.care.stoneware.title": "Kamenina",
    "data.care.stoneware.l1": "Myčka, mikrovlnka i trouba do 180 °C jsou v pořádku.",
    "data.care.stoneware.l2": "Neglazovaná patka může poznačit stůl — filcová podložka to vyřeší.",
    "data.care.stoneware.l3": "Kropenatost je železo v hlíně, které prorazí ven. Má tam být.",

    "data.machine.laser.name": "Laserová řezačka",
    "data.machine.laser.what":
      "Řeže a graví dřevo, překližku, akrylát a břidlici. Udělá většinu toho, co prodáváme.",
    "data.machine.printers.name": "Dvě malé tiskárny",
    "data.machine.printers.what":
      "Misky, květináče a všechno, co má oblouk. Jedou přes noc a ráno je vybíráme.",
    "data.machine.kiln.name": "Malá glazovací pec",
    "data.machine.kiln.what":
      "Nellina. Všechno točené jí projde dvakrát — jednou nahé, jednou glazované — a to je těch deset dnů.",

    "data.angle.front": "ZEPŘEDU",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "SHORA",
    "data.angle.detail": "DETAIL",
  },

  "da-DK": {
    "data.material.walnut.name": "Valnød",
    "data.material.walnut.short": "Valnød",
    "data.material.ply.name": "Birkekrydsfiner",
    "data.material.ply.short": "Krydsfiner",
    "data.material.slate.name": "Skifer",
    "data.material.slate.short": "Skifer",
    "data.material.acrylic.name": "Akryl",
    "data.material.acrylic.short": "Akryl",
    "data.material.resin.name": "Printet resin",
    "data.material.resin.short": "Resin",
    "data.material.stoneware.name": "Stentøj",
    "data.material.stoneware.short": "Stentøj",
    "data.runsOut.walnut": "valnød",
    "data.runsOut.ply": "krydsfiner",
    "data.runsOut.slate": "skiferemner",
    "data.runsOut.acrylic": "akryl",
    "data.runsOut.resin": "filament",
    "data.runsOut.stoneware": "glasur",

    "data.category.coasters": "Bordskånere",
    "data.category.signs": "Skilte",
    "data.category.keyrings": "Nøgleringe",
    "data.category.pots": "Potter",
    "data.category.desk": "Til skrivebordet",
    "data.category.mugs": "Krus",

    "data.size.small": "Lille",
    "data.size.standard": "Standard",
    "data.size.large": "Stor",
    "data.size.tall": "Høj",

    "data.finish.oiled": "Olieret",
    "data.finish.waxed": "Mørk voks",
    "data.finish.bare": "Ubehandlet",
    "data.finish.plain-edge": "Lige kant",
    "data.finish.bevelled": "Skrå kant",
    "data.finish.clear": "Klar",
    "data.finish.amber": "Rav",
    "data.finish.ink": "Blæk",
    "data.finish.matte-bone": "Ben",
    "data.finish.matte-sage": "Salvie",
    "data.finish.matte-clay": "Ler",
    "data.finish.oatmeal": "Havre",
    "data.finish.seafoam": "Havskum",
    "data.finish.ink-glaze": "Dyb blæk",

    "data.unit.each": "stykket",
    "data.unit.set-of-four": "sæt med fire",
    "data.unit.set-of-six": "sæt med seks",

    "data.product.walnut-coasters.name": "Graverede bordskånere i valnød",
    "data.product.ply-coasters.name": "Bordskånere i birkekrydsfiner",
    "data.product.house-sign.name": "Husskilt i skifer",
    "data.product.garden-markers.name": "Haveskilte i skifer",
    "data.product.keyring.name": "Nøglering i akryl",
    "data.product.pet-tag.name": "Graveret hundetegn",
    "data.product.desk-tray.name": "Printet skrivebordsbakke",
    "data.product.herb-pot.name": "Printet urtepotte",
    "data.product.stoneware-mug.name": "Håndglaseret krus",
    "data.product.cake-topper.name": "Kagepynt i to lag",
    "data.product.cutting-board.name": "Skærebræt i valnød",
    "data.product.wedding-sign.name": "Stående bryllupsskilt",
    "data.product.bookmark.name": "Bogmærke i valnød",
    "data.product.photo-block.name": "Fotoblok",

    "data.product.walnut-coasters.madeFrom":
      "Skåret i 3 mm amerikansk valnød og graveret på laseren. Fire i sættet, skåret af samme bræt, så åretegningen følges ad.",
    "data.product.ply-coasters.madeFrom":
      "Birkekrydsfiner, 4 mm, med den lyse side opad. Den muntre, og den vi laver flest af.",
    "data.product.house-sign.madeFrom":
      "Kløvet walisisk skifer med brudets egen marmorering. Graveret dybt nok til at kunne læses fra lågen.",
    "data.product.garden-markers.madeFrom":
      "Skiferrester skåret til pinde til krydderbedet. Seks i sættet, ét ord på hver, og de bliver stående i vådt vejr.",
    "data.product.keyring.madeFrom":
      "3 mm støbt akryl, skåret og graveret i ét hug, med en ring i hjørnet.",
    "data.product.pet-tag.madeFrom":
      "Samme akryl, mindre, med graveringen fyldt så den bliver ved med at kunne læses mod et halsbånd.",
    "data.product.desk-tray.madeFrom":
      "Printet på vores egne maskiner i mat finish, med en blød kant så intet triller af.",
    "data.product.herb-pot.madeFrom":
      "En printet potte til vindueskarmen, med drænhul og en underskål, der følger med.",
    "data.product.stoneware-mug.madeFrom":
      "Drejet af Nell i spættet stentøj og brændt to gange — derfor tager det ti værkstedsdage.",
    "data.product.cake-topper.madeFrom":
      "To lag valnød, hvor teksten er skåret gennem det øverste, så laget bagved kigger frem.",
    "data.product.cutting-board.madeFrom":
      "Massiv valnød, 18 mm, med saftrille og afrundet kant. Graveret på bagsiden, så fladen får lov at være en flade.",
    "data.product.wedding-sign.madeFrom":
      "Et stående skilt i 6 mm valnød med træfod, graveret med navnene og datoen.",
    "data.product.bookmark.madeFrom":
      "En tynd stribe valnød, olieret til den føles som en sten, graveret på langs.",
    "data.product.photo-block.madeFrom":
      "Dit billede printet på birkekrydsfiner og forseglet, i en blok der står på sin egen kant.",

    "data.finishedBy.walnut": "Slebet til korn 320 og afsluttet med en hårdvoksolie, vi blander selv.",
    "data.finishedBy.ply": "Slebet og ladt ubehandlet, eller olieret hvis du beder om det — krydsfiner kan lide at være i fred.",
    "data.finishedBy.slate": "Kanterne brudt i hånden; fladen er den, bruddet kløvede.",
    "data.finishedBy.acrylic": "Skærekanten er flammepoleret, så den læses som glas og ikke som et snit.",
    "data.finishedBy.resin": "Printet mat, og sømmen taget af i hånden.",
    "data.finishedBy.stoneware": "Glaseret inde og ude og så brændt en gang til for at sætte det.",

    "data.careSummary.walnut": "Tør det af, olier det en gang om året, og hold det ude af opvaskeren.",
    "data.careSummary.ply": "Tør det tørt. Krydsfiner og stillestående vand er ikke venner.",
    "data.careSummary.slate": "Skyl den. Den har ligget udenfor i fire hundrede millioner år.",
    "data.careSummary.acrylic": "Lunkent vand og en blød klud, aldrig noget med opløsningsmiddel i.",
    "data.careSummary.resin": "Vask i hånden, og hold den fra en brandvarm vindueskarm i juli.",
    "data.careSummary.stoneware": "Opvaskemaskine og mikroovn er begge fine. Brændt ved 1240 °C.",

    "data.personalHint.engraved-wood":
      "Skriv navnet og datoen. Vi sætter det i de bogstaver, du kan se på billederne — vil du have noget andet, så sig til, og vi svarer, før vi skærer.",
    "data.personalHint.engraved-slate":
      "Husnavn eller nummer, alt efter hvad I bruger. Skifer klarer korte ord bedst, og vi skriver, hvis det bliver trangt.",
    "data.personalHint.engraved-acrylic":
      "Ét kort ord eller et navn. Alt længere bliver hurtigt bittesmåt på et stykke i den størrelse.",
    "data.personalHint.painted-glaze":
      "Nell maler det på før anden brænding, så det ligger under glasuren og bliver der. Hold det kort.",
    "data.personalHint.markers":
      "Ét ord pr. skilt, adskilt med komma — vi skærer en pind til hvert. Seks i sættet.",

    "data.care.walnut.title": "Valnød",
    "data.care.walnut.l1": "Tør af med en fugtig klud og tør efter med det samme.",
    "data.care.walnut.l2": "En gang om året henter lidt olie på en klud farven tilbage.",
    "data.care.walnut.l3": "Aldrig i opvaskeren. Varmen rejser åretegningen, og olien er væk.",
    "data.care.ply.title": "Birkekrydsfiner",
    "data.care.ply.l1": "Tør den ordentligt — krydsfiner drikker, og stillestående vand løfter lagene.",
    "data.care.ply.l2": "Ubehandlet bliver den lidt mørkere af at blive rørt ved, og det kan vi lide.",
    "data.care.ply.l3": "Lidt voks en gang imellem, hvis du vil have den blankere end da den kom.",
    "data.care.slate.title": "Skifer",
    "data.care.slate.l1": "Skyl den under hanen og lad den tørre. Det er hele arbejdet.",
    "data.care.slate.l2": "Udenfor bliver den lysere i solen og kommer igen i regnen.",
    "data.care.slate.l3": "Graveringen er skåret ind, ikke malet på, så den kan ikke slides væk.",
    "data.care.acrylic.title": "Akryl",
    "data.care.acrylic.l1": "Lunkent vand, en dråbe sæbe, en blød klud.",
    "data.care.acrylic.l2": "Intet med opløsningsmiddel — det slører overfladen for altid.",
    "data.care.acrylic.l3": "Hold den fra radiatoren. Det er en plade, og plader slår sig.",
    "data.care.resin.title": "Printet resin",
    "data.care.resin.l1": "Vask den i hånden i lunkent vand.",
    "data.care.resin.l2": "Ikke i opvaskeren og ikke i mikroovnen.",
    "data.care.resin.l3": "En vindueskarm mod syd i juli blødgør den. Spørg os, hvordan vi ved det.",
    "data.care.stoneware.title": "Stentøj",
    "data.care.stoneware.l1": "Opvaskemaskine, mikroovn og ovn op til 180 °C er alle fine.",
    "data.care.stoneware.l2": "Den uglaserede fod kan mærke et bord — en filtpude klarer det.",
    "data.care.stoneware.l3": "Prikkerne er jern i leret, der kommer igennem. De skal være der.",

    "data.machine.laser.name": "Laserskæreren",
    "data.machine.laser.what":
      "Skærer og graverer træet, krydsfineren, akrylen og skiferen. Den laver det meste af det, vi sælger.",
    "data.machine.printers.name": "To små printere",
    "data.machine.printers.what":
      "Bakkerne, potterne og alt med en kurve. De kører om natten, og vi tømmer dem om morgenen.",
    "data.machine.kiln.name": "En lille glasurovn",
    "data.machine.kiln.what":
      "Nells. Alt drejet igennem den to gange — én gang nøgent, én gang glaseret — og det er de ti dage.",

    "data.angle.front": "FORFRA",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "OPPEFRA",
    "data.angle.detail": "DETALJE",
  },

  "zh-CN": {
    "data.material.walnut.name": "胡桃木",
    "data.material.walnut.short": "胡桃木",
    "data.material.ply.name": "桦木胶合板",
    "data.material.ply.short": "胶合板",
    "data.material.slate.name": "板岩",
    "data.material.slate.short": "板岩",
    "data.material.acrylic.name": "亚克力",
    "data.material.acrylic.short": "亚克力",
    "data.material.resin.name": "打印树脂",
    "data.material.resin.short": "树脂",
    "data.material.stoneware.name": "炻器",
    "data.material.stoneware.short": "炻器",
    "data.runsOut.walnut": "胡桃木",
    "data.runsOut.ply": "桦木胶合板",
    "data.runsOut.slate": "板岩坯",
    "data.runsOut.acrylic": "亚克力",
    "data.runsOut.resin": "打印耗材",
    "data.runsOut.stoneware": "釉料",

    "data.category.coasters": "杯垫",
    "data.category.signs": "牌子",
    "data.category.keyrings": "钥匙扣",
    "data.category.pots": "花盆",
    "data.category.desk": "桌上物件",
    "data.category.mugs": "马克杯",

    "data.size.small": "小",
    "data.size.standard": "标准",
    "data.size.large": "大",
    "data.size.tall": "高",

    "data.finish.oiled": "上油",
    "data.finish.waxed": "深色蜡",
    "data.finish.bare": "不做处理",
    "data.finish.plain-edge": "平边",
    "data.finish.bevelled": "斜边",
    "data.finish.clear": "透明",
    "data.finish.amber": "琥珀",
    "data.finish.ink": "墨色",
    "data.finish.matte-bone": "骨白",
    "data.finish.matte-sage": "鼠尾草绿",
    "data.finish.matte-clay": "陶土",
    "data.finish.oatmeal": "燕麦",
    "data.finish.seafoam": "海沫绿",
    "data.finish.ink-glaze": "深墨釉",

    "data.unit.each": "每件",
    "data.unit.set-of-four": "四件一组",
    "data.unit.set-of-six": "六件一组",

    "data.product.walnut-coasters.name": "胡桃木刻字杯垫",
    "data.product.ply-coasters.name": "桦木胶合板杯垫",
    "data.product.house-sign.name": "板岩门牌",
    "data.product.garden-markers.name": "板岩园艺名牌",
    "data.product.keyring.name": "亚克力钥匙扣",
    "data.product.pet-tag.name": "刻字宠物牌",
    "data.product.desk-tray.name": "打印桌面托盘",
    "data.product.herb-pot.name": "打印香草花盆",
    "data.product.stoneware-mug.name": "手工上釉马克杯",
    "data.product.cake-topper.name": "双层蛋糕插牌",
    "data.product.cutting-board.name": "胡桃木砧板",
    "data.product.wedding-sign.name": "站立式婚礼牌",
    "data.product.bookmark.name": "胡桃木书签",
    "data.product.photo-block.name": "照片木块",

    "data.product.walnut-coasters.madeFrom":
      "用 3 毫米美国黑胡桃木切割，激光刻字。四片一组，取自同一块板，木纹能连起来。",
    "data.product.ply-coasters.madeFrom":
      "4 毫米桦木胶合板，浅色一面朝上。轻快的一款，也是我们做得最多的一款。",
    "data.product.house-sign.madeFrom": "劈开的威尔士板岩，带着采石场自己的纹理。刻得够深，从大门口就能看清。",
    "data.product.garden-markers.madeFrom":
      "板岩边料切成插签，给香草地用。六片一组，每片一个词，下雨也照样立着。",
    "data.product.keyring.madeFrom": "3 毫米浇铸亚克力，一次走刀切割并刻字，角上穿一个开口环。",
    "data.product.pet-tag.madeFrom": "同样的亚克力，小一号，刻痕填色，贴着项圈也看得清。",
    "data.product.desk-tray.madeFrom": "在我们自己的机器上打印，哑光表面，边沿微翘，东西不会滚下去。",
    "data.product.herb-pot.madeFrom": "给窗台用的打印花盆，带排水孔，配一个接水碟。",
    "data.product.stoneware-mug.madeFrom": "Nell 用带斑点的炻土拉坯，烧两遍——所以要十个工坊日。",
    "data.product.cake-topper.madeFrom": "两层胡桃木，字从上面一层透雕出来，让后面那层透出来。",
    "data.product.cutting-board.madeFrom":
      "18 毫米实心胡桃木，带集汁槽和圆边。字刻在背面，正面留作正面。",
    "data.product.wedding-sign.madeFrom": "6 毫米胡桃木站立牌，配木底座，刻上名字和日期。",
    "data.product.bookmark.madeFrom": "一条薄薄的胡桃木，上油上到摸起来像块石头，沿长边刻字。",
    "data.product.photo-block.madeFrom": "你的照片印在桦木胶合板上再封层，做成能立在自己边上的木块。",

    "data.finishedBy.walnut": "打磨到 320 目，再用我们自己调的硬蜡油收尾。",
    "data.finishedBy.ply": "打磨后不做处理，你要的话也可以上油——胶合板喜欢被放着不管。",
    "data.finishedBy.slate": "边缘手工磨顺；表面就是采石场劈出来的那一面。",
    "data.finishedBy.acrylic": "切口做火焰抛光，看起来像玻璃，而不是一道切口。",
    "data.finishedBy.resin": "打印成哑光，接缝手工修掉。",
    "data.finishedBy.stoneware": "内外都上釉，再烧第二遍定住。",

    "data.careSummary.walnut": "擦一擦，一年上一次油，别进洗碗机。",
    "data.careSummary.ply": "擦干。胶合板和积水处不来。",
    "data.careSummary.slate": "冲一冲就行。它在外面待了四亿年了。",
    "data.careSummary.acrylic": "温水加软布，绝对不要用带溶剂的东西。",
    "data.careSummary.resin": "手洗，七月别放在晒烫的窗台上。",
    "data.careSummary.stoneware": "洗碗机和微波炉都没问题。1240°C 烧成。",

    "data.personalHint.engraved-wood":
      "把名字和日期告诉我们。我们会用图上那种字体来排——想要别的就说一声，动刀之前我们会回你。",
    "data.personalHint.engraved-slate":
      "房名或门牌号，你们用哪个都行。板岩最适合短词，要是排得太挤，我们会写信问你。",
    "data.personalHint.engraved-acrylic": "一个短词或一个名字。再长一点，在这么小的一片上很快就细得看不清。",
    "data.personalHint.painted-glaze": "Nell 会在第二次烧之前画上去，压在釉下，不会掉。写短一点。",
    "data.personalHint.markers": "一片一个词，用逗号隔开——我们按数量切插签。六片一组。",

    "data.care.walnut.title": "胡桃木",
    "data.care.walnut.l1": "用湿布擦一擦，随后马上擦干。",
    "data.care.walnut.l2": "一年一次，用布蘸一点油就能把颜色带回来。",
    "data.care.walnut.l3": "千万别进洗碗机。热气会把木纹顶起来，油也没了。",
    "data.care.ply.title": "桦木胶合板",
    "data.care.ply.l1": "一定要擦干——胶合板吸水，积水会把层顶起来。",
    "data.care.ply.l2": "不做处理的话，越用会越深一点，我们喜欢这样。",
    "data.care.ply.l3": "想比刚拿到时更亮，偶尔打点蜡。",
    "data.care.slate.title": "板岩",
    "data.care.slate.l1": "水龙头下冲一冲，晾干。就这么多。",
    "data.care.slate.l2": "放在户外，太阳晒会变淡，下过雨又回来。",
    "data.care.slate.l3": "字是刻进去的，不是画上去的，磨不掉。",
    "data.care.acrylic.title": "亚克力",
    "data.care.acrylic.l1": "温水、一滴洗洁精、一块软布。",
    "data.care.acrylic.l2": "不要用带溶剂的东西——表面一雾就回不来了。",
    "data.care.acrylic.l3": "别放暖气片上。它是一块片材，片材会翘。",
    "data.care.resin.title": "打印树脂",
    "data.care.resin.l1": "用温水手洗。",
    "data.care.resin.l2": "不要洗碗机，也不要微波炉。",
    "data.care.resin.l3": "七月朝南的窗台会把它晒软。别问我们怎么知道的。",
    "data.care.stoneware.title": "炻器",
    "data.care.stoneware.l1": "洗碗机、微波炉，以及 180°C 以内的烤箱都没问题。",
    "data.care.stoneware.l2": "没上釉的底圈可能会蹭到桌面——垫一块毛毡就好。",
    "data.care.stoneware.l3": "斑点是泥料里的铁透出来的。本来就该有。",

    "data.machine.laser.name": "激光切割机",
    "data.machine.laser.what": "切割并雕刻木头、胶合板、亚克力和板岩。我们卖的东西大半都靠它。",
    "data.machine.printers.name": "两台小打印机",
    "data.machine.printers.what": "托盘、花盆，以及所有带弧度的东西。它们通宵跑，我们早上来取。",
    "data.machine.kiln.name": "一台小釉窑",
    "data.machine.kiln.what": "Nell 的。所有拉坯的东西都要过两遍——一遍素坯，一遍上釉——那就是那十天。",

    "data.angle.front": "正面",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "顶面",
    "data.angle.detail": "细节",
  },

  "zh-TW": {
    "data.material.walnut.name": "胡桃木",
    "data.material.walnut.short": "胡桃木",
    "data.material.ply.name": "樺木夾板",
    "data.material.ply.short": "夾板",
    "data.material.slate.name": "板岩",
    "data.material.slate.short": "板岩",
    "data.material.acrylic.name": "壓克力",
    "data.material.acrylic.short": "壓克力",
    "data.material.resin.name": "列印樹脂",
    "data.material.resin.short": "樹脂",
    "data.material.stoneware.name": "炻器",
    "data.material.stoneware.short": "炻器",
    "data.runsOut.walnut": "胡桃木",
    "data.runsOut.ply": "樺木夾板",
    "data.runsOut.slate": "板岩胚",
    "data.runsOut.acrylic": "壓克力",
    "data.runsOut.resin": "列印耗材",
    "data.runsOut.stoneware": "釉料",

    "data.category.coasters": "杯墊",
    "data.category.signs": "牌子",
    "data.category.keyrings": "鑰匙圈",
    "data.category.pots": "花盆",
    "data.category.desk": "桌上物件",
    "data.category.mugs": "馬克杯",

    "data.size.small": "小",
    "data.size.standard": "標準",
    "data.size.large": "大",
    "data.size.tall": "高",

    "data.finish.oiled": "上油",
    "data.finish.waxed": "深色蠟",
    "data.finish.bare": "不做處理",
    "data.finish.plain-edge": "平邊",
    "data.finish.bevelled": "斜邊",
    "data.finish.clear": "透明",
    "data.finish.amber": "琥珀",
    "data.finish.ink": "墨色",
    "data.finish.matte-bone": "骨白",
    "data.finish.matte-sage": "鼠尾草綠",
    "data.finish.matte-clay": "陶土",
    "data.finish.oatmeal": "燕麥",
    "data.finish.seafoam": "海沫綠",
    "data.finish.ink-glaze": "深墨釉",

    "data.unit.each": "每件",
    "data.unit.set-of-four": "四件一組",
    "data.unit.set-of-six": "六件一組",

    "data.product.walnut-coasters.name": "胡桃木刻字杯墊",
    "data.product.ply-coasters.name": "樺木夾板杯墊",
    "data.product.house-sign.name": "板岩門牌",
    "data.product.garden-markers.name": "板岩園藝名牌",
    "data.product.keyring.name": "壓克力鑰匙圈",
    "data.product.pet-tag.name": "刻字寵物牌",
    "data.product.desk-tray.name": "列印桌面托盤",
    "data.product.herb-pot.name": "列印香草花盆",
    "data.product.stoneware-mug.name": "手工上釉馬克杯",
    "data.product.cake-topper.name": "雙層蛋糕插牌",
    "data.product.cutting-board.name": "胡桃木砧板",
    "data.product.wedding-sign.name": "站立式婚禮牌",
    "data.product.bookmark.name": "胡桃木書籤",
    "data.product.photo-block.name": "照片木塊",

    "data.product.walnut-coasters.madeFrom":
      "用 3 公釐美國黑胡桃木切割，雷射刻字。四片一組，取自同一塊板，木紋能連起來。",
    "data.product.ply-coasters.madeFrom":
      "4 公釐樺木夾板，淺色那面朝上。輕快的一款，也是我們做得最多的一款。",
    "data.product.house-sign.madeFrom": "劈開的威爾斯板岩，帶著採石場自己的紋理。刻得夠深，從大門口就看得清。",
    "data.product.garden-markers.madeFrom":
      "板岩邊料切成插籤，給香草地用。六片一組，每片一個詞，下雨也照樣立著。",
    "data.product.keyring.madeFrom": "3 公釐澆鑄壓克力，一次走刀切割並刻字，角上穿一個開口環。",
    "data.product.pet-tag.madeFrom": "同樣的壓克力，小一號，刻痕填色，貼著項圈也看得清。",
    "data.product.desk-tray.madeFrom": "在我們自己的機器上列印，霧面表面，邊沿微翹，東西不會滾下去。",
    "data.product.herb-pot.madeFrom": "給窗台用的列印花盆，帶排水孔，配一個接水碟。",
    "data.product.stoneware-mug.madeFrom": "Nell 用帶斑點的炻土拉坯，燒兩遍——所以要十個工坊日。",
    "data.product.cake-topper.madeFrom": "兩層胡桃木，字從上面一層透雕出來，讓後面那層透出來。",
    "data.product.cutting-board.madeFrom":
      "18 公釐實心胡桃木，帶集汁槽和圓邊。字刻在背面，正面留作正面。",
    "data.product.wedding-sign.madeFrom": "6 公釐胡桃木站立牌，配木底座，刻上名字和日期。",
    "data.product.bookmark.madeFrom": "一條薄薄的胡桃木，上油上到摸起來像塊石頭，沿長邊刻字。",
    "data.product.photo-block.madeFrom": "你的照片印在樺木夾板上再封層，做成能立在自己邊上的木塊。",

    "data.finishedBy.walnut": "打磨到 320 目，再用我們自己調的硬蠟油收尾。",
    "data.finishedBy.ply": "打磨後不做處理，你要的話也可以上油——夾板喜歡被放著不管。",
    "data.finishedBy.slate": "邊緣手工磨順；表面就是採石場劈出來的那一面。",
    "data.finishedBy.acrylic": "切口做火焰拋光，看起來像玻璃，而不是一道切口。",
    "data.finishedBy.resin": "列印成霧面，接縫手工修掉。",
    "data.finishedBy.stoneware": "內外都上釉，再燒第二遍定住。",

    "data.careSummary.walnut": "擦一擦，一年上一次油，別進洗碗機。",
    "data.careSummary.ply": "擦乾。夾板和積水處不來。",
    "data.careSummary.slate": "沖一沖就行。它在外面待了四億年了。",
    "data.careSummary.acrylic": "溫水加軟布，絕對不要用帶溶劑的東西。",
    "data.careSummary.resin": "手洗，七月別放在曬燙的窗台上。",
    "data.careSummary.stoneware": "洗碗機和微波爐都沒問題。1240°C 燒成。",

    "data.personalHint.engraved-wood":
      "把名字和日期告訴我們。我們會用圖上那種字體來排——想要別的就說一聲，動刀之前我們會回你。",
    "data.personalHint.engraved-slate":
      "房名或門牌號，你們用哪個都行。板岩最適合短詞，要是排得太擠，我們會寫信問你。",
    "data.personalHint.engraved-acrylic": "一個短詞或一個名字。再長一點，在這麼小的一片上很快就細得看不清。",
    "data.personalHint.painted-glaze": "Nell 會在第二次燒之前畫上去，壓在釉下，不會掉。寫短一點。",
    "data.personalHint.markers": "一片一個詞，用逗號隔開——我們按數量切插籤。六片一組。",

    "data.care.walnut.title": "胡桃木",
    "data.care.walnut.l1": "用濕布擦一擦，隨後馬上擦乾。",
    "data.care.walnut.l2": "一年一次，用布沾一點油就能把顏色帶回來。",
    "data.care.walnut.l3": "千萬別進洗碗機。熱氣會把木紋頂起來，油也沒了。",
    "data.care.ply.title": "樺木夾板",
    "data.care.ply.l1": "一定要擦乾——夾板吸水，積水會把層頂起來。",
    "data.care.ply.l2": "不做處理的話，越用會越深一點，我們喜歡這樣。",
    "data.care.ply.l3": "想比剛拿到時更亮，偶爾打點蠟。",
    "data.care.slate.title": "板岩",
    "data.care.slate.l1": "水龍頭下沖一沖，晾乾。就這麼多。",
    "data.care.slate.l2": "放在戶外，太陽曬會變淡，下過雨又回來。",
    "data.care.slate.l3": "字是刻進去的，不是畫上去的，磨不掉。",
    "data.care.acrylic.title": "壓克力",
    "data.care.acrylic.l1": "溫水、一滴洗碗精、一塊軟布。",
    "data.care.acrylic.l2": "不要用帶溶劑的東西——表面一霧就回不來了。",
    "data.care.acrylic.l3": "別放暖氣上。它是一塊片材，片材會翹。",
    "data.care.resin.title": "列印樹脂",
    "data.care.resin.l1": "用溫水手洗。",
    "data.care.resin.l2": "不要洗碗機，也不要微波爐。",
    "data.care.resin.l3": "七月朝南的窗台會把它曬軟。別問我們怎麼知道的。",
    "data.care.stoneware.title": "炻器",
    "data.care.stoneware.l1": "洗碗機、微波爐，以及 180°C 以內的烤箱都沒問題。",
    "data.care.stoneware.l2": "沒上釉的底圈可能會蹭到桌面——墊一塊毛氈就好。",
    "data.care.stoneware.l3": "斑點是泥料裡的鐵透出來的。本來就該有。",

    "data.machine.laser.name": "雷射切割機",
    "data.machine.laser.what": "切割並雕刻木頭、夾板、壓克力和板岩。我們賣的東西大半都靠它。",
    "data.machine.printers.name": "兩台小印表機",
    "data.machine.printers.what": "托盤、花盆，以及所有帶弧度的東西。它們整夜跑，我們早上來取。",
    "data.machine.kiln.name": "一台小釉窯",
    "data.machine.kiln.what": "Nell 的。所有拉坯的東西都要過兩遍——一遍素坯，一遍上釉——那就是那十天。",

    "data.angle.front": "正面",
    "data.angle.threeQuarter": "3/4",
    "data.angle.top": "頂面",
    "data.angle.detail": "細節",
  },

  "ar-EG": {
    "data.material.walnut.name": "خشب الجوز",
    "data.material.walnut.short": "جوز",
    "data.material.ply.name": "أبلكاش البتولا",
    "data.material.ply.short": "أبلكاش",
    "data.material.slate.name": "حجر أردوازي",
    "data.material.slate.short": "أردواز",
    "data.material.acrylic.name": "أكريليك",
    "data.material.acrylic.short": "أكريليك",
    "data.material.resin.name": "راتنج مطبوع",
    "data.material.resin.short": "راتنج",
    "data.material.stoneware.name": "خزف حجري",
    "data.material.stoneware.short": "خزف",
    "data.runsOut.walnut": "خشب الجوز",
    "data.runsOut.ply": "أبلكاش البتولا",
    "data.runsOut.slate": "ألواح الأردواز",
    "data.runsOut.acrylic": "الأكريليك",
    "data.runsOut.resin": "خيط الطباعة",
    "data.runsOut.stoneware": "الطلاء الزجاجي",

    "data.category.coasters": "قواعد أكواب",
    "data.category.signs": "لافتات",
    "data.category.keyrings": "ميداليات مفاتيح",
    "data.category.pots": "أصص",
    "data.category.desk": "قطع للمكتب",
    "data.category.mugs": "أكواب",

    "data.size.small": "صغير",
    "data.size.standard": "قياسي",
    "data.size.large": "كبير",
    "data.size.tall": "مرتفع",

    "data.finish.oiled": "مدهون بالزيت",
    "data.finish.waxed": "شمع داكن",
    "data.finish.bare": "متروك على طبيعته",
    "data.finish.plain-edge": "حافة مستقيمة",
    "data.finish.bevelled": "حافة مشطوفة",
    "data.finish.clear": "شفاف",
    "data.finish.amber": "كهرماني",
    "data.finish.ink": "حبري",
    "data.finish.matte-bone": "عاجي",
    "data.finish.matte-sage": "مريمي",
    "data.finish.matte-clay": "طيني",
    "data.finish.oatmeal": "شوفاني",
    "data.finish.seafoam": "زبد البحر",
    "data.finish.ink-glaze": "حبري غامق",

    "data.unit.each": "للقطعة",
    "data.unit.set-of-four": "طقم من أربع",
    "data.unit.set-of-six": "طقم من ست",

    "data.product.walnut-coasters.name": "قواعد أكواب من الجوز محفورة",
    "data.product.ply-coasters.name": "قواعد أكواب من أبلكاش البتولا",
    "data.product.house-sign.name": "لافتة منزل من الأردواز",
    "data.product.garden-markers.name": "علامات حديقة من الأردواز",
    "data.product.keyring.name": "ميدالية مفاتيح أكريليك",
    "data.product.pet-tag.name": "بطاقة حيوان محفورة",
    "data.product.desk-tray.name": "صينية مكتب مطبوعة",
    "data.product.herb-pot.name": "أصيص أعشاب مطبوع",
    "data.product.stoneware-mug.name": "كوب مطلي يدويًا",
    "data.product.cake-topper.name": "زينة كعك من طبقتين",
    "data.product.cutting-board.name": "لوح تقطيع من الجوز",
    "data.product.wedding-sign.name": "لافتة زفاف قائمة",
    "data.product.bookmark.name": "فاصل كتب من الجوز",
    "data.product.photo-block.name": "مكعب صورة",

    "data.product.walnut-coasters.madeFrom":
      "تُقص من جوز أمريكي أسود بسمك ٣ مم وتُحفر بالليزر. أربع في الطقم، من لوح واحد حتى يتصل عرق الخشب.",
    "data.product.ply-coasters.madeFrom":
      "أبلكاش بتولا بسمك ٤ مم، بالوجه الفاتح للأعلى. القطعة المرحة، وأكثر ما نصنعه.",
    "data.product.house-sign.madeFrom":
      "أردواز ويلزي مشقوق بعروقه الطبيعية من المحجر. محفور بعمق يكفي لقراءته من البوابة.",
    "data.product.garden-markers.madeFrom":
      "بقايا أردواز تُقص أوتادًا لحوض الأعشاب. ست في الطقم، كلمة على كل واحدة، وتثبت في البلل.",
    "data.product.keyring.madeFrom": "أكريليك مصبوب بسمك ٣ مم، يُقص ويُحفر في مرور واحد، مع حلقة في الزاوية.",
    "data.product.pet-tag.madeFrom": "الأكريليك نفسه، أصغر، بحفر مملوء ليظل مقروءًا على الطوق.",
    "data.product.desk-tray.madeFrom": "مطبوعة على آلاتنا بلمسة مطفأة، بحافة ناعمة حتى لا يتدحرج شيء.",
    "data.product.herb-pot.madeFrom": "أصيص مطبوع لحافة الشباك، بفتحة تصريف وطبق يأتي معه.",
    "data.product.stoneware-mug.madeFrom":
      "تشكّله نيل على العجلة من خزف منقّط ويُحرق مرتين — ولهذا يأخذ عشرة أيام عمل.",
    "data.product.cake-topper.madeFrom":
      "طبقتان من الجوز، الكلمات مقصوصة في العليا حتى تظهر الطبقة التي خلفها.",
    "data.product.cutting-board.madeFrom":
      "جوز مصمت بسمك ١٨ مم، بمجرى للعصارة وحافة مستديرة. الحفر في الظهر حتى يبقى الوجه وجهًا.",
    "data.product.wedding-sign.madeFrom":
      "لافتة قائمة من جوز بسمك ٦ مم بقاعدة خشبية، محفورة بالأسماء والتاريخ.",
    "data.product.bookmark.madeFrom": "شريحة رفيعة من الجوز، تُدهن حتى تصير ملمسها كالحصاة، محفورة بالطول.",
    "data.product.photo-block.madeFrom":
      "صورتك مطبوعة على أبلكاش البتولا ومغلّفة، في مكعب يقف على حافته.",

    "data.finishedBy.walnut": "يُصنفر حتى حبيبات ٣٢٠ ويُنهى بزيت شمعي صلب نخلطه بأنفسنا.",
    "data.finishedBy.ply": "يُصنفر ويُترك على طبيعته، أو يُدهن إن طلبت — الأبلكاش يحب أن يُترك وشأنه.",
    "data.finishedBy.slate": "الحواف تُلطّف باليد؛ والوجه هو الوجه الذي شقّه المحجر.",
    "data.finishedBy.acrylic": "الحافة المقصوصة مصقولة باللهب لتبدو كالزجاج لا كأثر قص.",
    "data.finishedBy.resin": "يُطبع بلمسة مطفأة ويُزال الخط باليد.",
    "data.finishedBy.stoneware": "يُطلى من الداخل والخارج ثم يُحرق مرة ثانية ليثبت.",

    "data.careSummary.walnut": "امسحه، وادهنه مرة في السنة، وأبعده عن غسالة الأطباق.",
    "data.careSummary.ply": "جففه بالمسح. الأبلكاش والماء الراكد لا يتفقان.",
    "data.careSummary.slate": "اشطفه. هو في الخارج منذ أربعمئة مليون سنة.",
    "data.careSummary.acrylic": "ماء دافئ وقطعة قماش ناعمة، ولا شيء فيه مذيب أبدًا.",
    "data.careSummary.resin": "اغسله باليد وأبعده عن حافة شباك حارة في يوليو.",
    "data.careSummary.stoneware": "غسالة الأطباق والميكروويف كلاهما مناسب. حُرق على ١٢٤٠ درجة.",

    "data.personalHint.engraved-wood":
      "اكتب لنا الاسم والتاريخ. نضبطه بالخط الذي تراه في الصور — وإن أردت غيره فقل، ونرد عليك قبل أن نقص.",
    "data.personalHint.engraved-slate":
      "اسم البيت أو رقمه، أيهما تستعملون. الأردواز يقبل الكلمات القصيرة أكثر، وسنكتب لك إن ضاق المكان.",
    "data.personalHint.engraved-acrylic": "كلمة قصيرة أو اسم. أي شيء أطول يصغر بسرعة على قطعة بهذا الحجم.",
    "data.personalHint.painted-glaze":
      "ترسمه نيل قبل الحرقة الثانية، فيقع تحت الطلاء ويبقى هناك. اجعله قصيرًا.",
    "data.personalHint.markers":
      "كلمة لكل علامة، مفصولة بفواصل — نقص وتدًا لكل واحدة. ست في الطقم.",

    "data.care.walnut.title": "خشب الجوز",
    "data.care.walnut.l1": "امسحه بقطعة قماش مبللة وجففه فورًا.",
    "data.care.walnut.l2": "مرة في السنة، قليل من الزيت على خرقة يعيد اللون.",
    "data.care.walnut.l3": "لا لغسالة الأطباق أبدًا. الحرارة ترفع عرق الخشب ويذهب الزيت.",
    "data.care.ply.title": "أبلكاش البتولا",
    "data.care.ply.l1": "جففه جيدًا — الأبلكاش يشرب، والماء الراكد يرفع طبقاته.",
    "data.care.ply.l2": "متروكًا على طبيعته يغمق قليلًا مع الاستعمال، وهذا يعجبنا.",
    "data.care.ply.l3": "شمع بين حين وآخر، إن أردته ألمع مما وصلك.",
    "data.care.slate.title": "الأردواز",
    "data.care.slate.l1": "اشطفه تحت الصنبور واتركه يجف. هذا كل شيء.",
    "data.care.slate.l2": "في الخارج يشحب في الشمس ويعود مع المطر.",
    "data.care.slate.l3": "الحفر محفور لا مرسوم، فلا يمكن أن يزول.",
    "data.care.acrylic.title": "الأكريليك",
    "data.care.acrylic.l1": "ماء دافئ، وقطرة صابون، وقماشة ناعمة.",
    "data.care.acrylic.l2": "لا شيء فيه مذيب — يعتم السطح إلى الأبد.",
    "data.care.acrylic.l3": "أبعده عن المدفأة. هو لوح، والألواح تتقوس.",
    "data.care.resin.title": "الراتنج المطبوع",
    "data.care.resin.l1": "اغسله باليد بماء دافئ.",
    "data.care.resin.l2": "لا في غسالة الأطباق ولا في الميكروويف.",
    "data.care.resin.l3": "حافة شباك جنوبية في يوليو تليّنه. اسألنا كيف عرفنا.",
    "data.care.stoneware.title": "الخزف الحجري",
    "data.care.stoneware.l1": "غسالة الأطباق والميكروويف والفرن حتى ١٨٠ درجة كلها مناسبة.",
    "data.care.stoneware.l2": "القاعدة غير المطلية قد تترك أثرًا على الطاولة — لبادة لباد تحلها.",
    "data.care.stoneware.l3": "النقط هي حديد في الطين يظهر. من المفترض أن تكون هناك.",

    "data.machine.laser.name": "قاطعة الليزر",
    "data.machine.laser.what":
      "تقص وتحفر الخشب والأبلكاش والأكريليك والأردواز. تصنع معظم ما نبيعه.",
    "data.machine.printers.name": "طابعتان صغيرتان",
    "data.machine.printers.what":
      "الصواني والأصص وكل ما فيه انحناء. تعملان في الليل ونفرغهما في الصباح.",
    "data.machine.kiln.name": "فرن طلاء صغير",
    "data.machine.kiln.what":
      "فرن نيل. كل ما يُشكَّل على العجلة يمر فيه مرتين — مرة عاريًا ومرة مطليًا — وهذه هي الأيام العشرة.",

    "data.angle.front": "الأمام",
    "data.angle.threeQuarter": "٣/٤",
    "data.angle.top": "الأعلى",
    "data.angle.detail": "تفصيل",
  },
} as const;
