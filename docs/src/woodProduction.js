// Wood production data for Lumberjack / Wood Gatherer job.
// Data format:
// Biome|Tool Level|Crew Size|Firewood_kg|Poles_kg|Logs_kg|Common Examples|Avg Mature Height|Avg Mature Above-Ground Weight|Tree Density (per ha)|Regrowth Time (Full Maturity)|Avg Harvest Age|Avg Yield per Tree (m3)|Rarity|Abundance|Notes
const rawData = `
Alpine|No Tools|1|96|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|No Tools|2|192|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|No Tools|3|268.8|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|No Tools|4|336|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|1|115.2|126|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|2|230.4|252|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|3|322.6|352.8|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|4|403.2|441|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|1|115.2|144|160|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|2|230.4|288|384|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|3|322.6|403.2|640|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|4|403.2|504|960|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Boreal (Taiga)|No Tools|1|192|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|No Tools|2|384|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|No Tools|3|537.6|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|No Tools|4|672|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|1|230.4|216|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|2|460.8|432|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|3|645.1|604.8|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|4|806.4|756|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|1|268.8|252|240|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|2|537.6|504|576|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|3|752.6|705.6|960|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|4|940.8|882|1440|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Coastal (Temperate)|No Tools|1|345.6|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|No Tools|2|691.2|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|No Tools|3|967.7|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|No Tools|4|1209.6|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|1|403.2|288|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|2|806.4|576|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|3|1129|806.4|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|4|1411.2|1008|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|1|460.8|378|320|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|2|921.6|756|768|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|3|1290.2|1058.4|1280|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|4|1612.8|1323|1920|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Tropical)|No Tools|1|369.6|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|No Tools|2|739.2|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|No Tools|3|1034.9|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|No Tools|4|1293.6|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|1|499.8|352|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|2|999.6|704|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|3|1399.4|985.6|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|4|1749.3|1232|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|1|567|462|320|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|2|1134|924|768|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|3|1587.6|1293.6|1280|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|4|1984.5|1617|1920|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Flooded Grasslands / Swamp|No Tools|1|234|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|No Tools|2|468|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|No Tools|3|655.2|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|No Tools|4|819|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|1|312|312|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|2|624|624|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|3|873.6|873.6|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|4|1092|1092|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|1|364|364|240|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|2|728|728|576|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|3|1019.2|1019.2|960|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|4|1274|1274|1440|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Island (Temperate)|No Tools|1|192|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|No Tools|2|384|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|No Tools|3|537.6|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|No Tools|4|672|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|1|230.4|216|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|2|460.8|432|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|3|645.1|604.8|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|4|806.4|756|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|1|268.8|252|240|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|2|537.6|504|576|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|3|752.6|705.6|960|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|4|940.8|882|1440|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Tropical)|No Tools|1|192|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|No Tools|2|384|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|No Tools|3|537.6|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|No Tools|4|672|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|1|230.4|216|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|2|460.8|432|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|3|645.1|604.8|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|4|806.4|756|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|1|268.8|252|240|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|2|537.6|504|576|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|3|752.6|705.6|960|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|4|940.8|882|1440|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Mangrove|No Tools|1|577.2|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|No Tools|2|1154.4|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|No Tools|3|1616.2|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|No Tools|4|2020.2|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|1|858|520|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|2|1716|1040|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|3|2402.4|1456|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|4|3003|1820|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|1|1128.4|702|400|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|2|2256.8|1404|960|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|3|3159.5|1965.6|1600|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|4|3949.4|2457|2400|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mediterranean Woodland|No Tools|1|234|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|No Tools|2|468|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|No Tools|3|655.2|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|No Tools|4|819|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|1|312|312|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|2|624|624|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|3|873.6|873.6|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|4|1092|1092|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|1|364|364|240|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|2|728|728|576|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|3|1019.2|1019.2|960|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|4|1274|1274|1440|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Montane / Cloud|No Tools|1|218.4|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|No Tools|2|436.8|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|No Tools|3|611.5|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|No Tools|4|764.4|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|1|264.6|264|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|2|529.2|528|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|3|740.9|739.2|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|4|926.1|924|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|1|302.4|308|240|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|2|604.8|616|576|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|3|846.7|862.4|960|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|4|1058.4|1078|1440|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Savanna|No Tools|1|124.8|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|No Tools|2|249.6|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|No Tools|3|349.4|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|No Tools|4|436.8|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|1|156|182|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|2|312|364|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|3|436.8|509.6|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|4|546|637|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|1|182|208|160|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|2|364|416|384|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|3|509.6|582.4|640|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|4|637|728|960|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Temperate Deciduous|No Tools|1|390|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|No Tools|2|780|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|No Tools|3|1092|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|No Tools|4|1365|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|1|546|416|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|2|1092|832|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|3|1528.8|1164.8|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|4|1911|1456|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|1|655.2|546|320|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|2|1310.4|1092|768|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|3|1834.6|1528.8|1280|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|4|2293.2|1911|1920|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Rainforest|No Tools|1|345.6|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|No Tools|2|691.2|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|No Tools|3|967.7|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|No Tools|4|1209.6|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|1|403.2|288|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|2|806.4|576|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|3|1129|806.4|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|4|1411.2|1008|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|1|460.8|378|320|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|2|921.6|756|768|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|3|1290.2|1058.4|1280|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|4|1612.8|1323|1920|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Tropical Monsoon|No Tools|1|390|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|No Tools|2|780|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|No Tools|3|1092|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|No Tools|4|1365|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|1|546|416|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|2|1092|832|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|3|1528.8|1164.8|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|4|1911|1456|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|1|655.2|546|320|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|2|1310.4|1092|768|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|3|1834.6|1528.8|1280|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|4|2293.2|1911|1920|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Rainforest|No Tools|1|554.4|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|No Tools|2|1108.8|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|No Tools|3|1552.3|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|No Tools|4|1940.4|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|1|823.2|440|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|2|1646.4|880|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|3|2305|1232|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|4|2881.2|1540|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|1|982.8|594|400|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|2|1965.6|1188|960|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|3|2751.8|1663.2|1600|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|4|3439.8|2079|2400|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
`;

const entries = rawData.trim().split('\n').map(line => {
  const [biome, toolLevel, crewSize, firewoodKg, polesKg, logsKg, commonExamples, avgMatureHeight, avgMatureAboveGroundWeight, treeDensityPerHa, regrowthTime, avgHarvestAge, avgYieldPerTree, rarity, abundance, notes] = line.split('|');
  return {
    biome,
    toolLevel,
    crewSize: Number(crewSize),
    firewoodKg: Number(firewoodKg),
    polesKg: Number(polesKg),
    logsKg: Number(logsKg),
    commonExamples,
    avgMatureHeight,
    avgMatureAboveGroundWeight,
    treeDensityPerHa,
    regrowthTime,
    avgHarvestAge,
    avgYieldPerTree,
    rarity,
    abundance,
    notes
  };
});

const woodProductionMap = new Map();
for (const e of entries) {
  woodProductionMap.set(`${e.biome}|${e.toolLevel}|${e.crewSize}`, e);
}

export function getWoodProduction(biome, toolLevel, crewSize) {
  return woodProductionMap.get(`${biome}|${toolLevel}|${crewSize}`);
}

export { entries as woodProductionData };

