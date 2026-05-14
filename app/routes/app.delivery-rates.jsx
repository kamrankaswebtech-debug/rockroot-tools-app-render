import { useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

// Default suburb data — used only for first-time seeding
// Format: "Suburb": { prices: [weekday, saturday, sunday], postalCode: "XXXX" }
const DEFAULT_SUBURBS = {
  "Abbotsbury": { prices: [140, 170, 215], postalCode: "2176" },
  "Abbotsford": { prices: [270, 345, 455], postalCode: "2046" },
  "Acacia Gardens": { prices: [65, 75, 85], postalCode: "2763" },
  "Agnes Banks": { prices: [55, 65, 75], postalCode: "2753" },
  "Airds": { prices: [270, 345, 455], postalCode: "2560" },
  "Alexandria": { prices: [300, 390, 530], postalCode: "2015" },
  "Alfords Point": { prices: [340, 440, 585], postalCode: "2234" },
  "Allambie Heights": { prices: [320, 415, 560], postalCode: "2100" },
  "Allawah": { prices: [320, 415, 560], postalCode: "2218" },
  "Ambarvale": { prices: [290, 380, 500], postalCode: "2560" },
  "Angus": { prices: [60, 70, 80], postalCode: "2756" },
  "Annandale": { prices: [300, 390, 530], postalCode: "2038" },
  "Annangrove": { prices: [65, 75, 85], postalCode: "2156" },
  "Appin": { prices: [420, 550, 720], postalCode: "2560" },
  "Arcadia": { prices: [140, 170, 215], postalCode: "2159" },
  "Arncliffe": { prices: [300, 390, 530], postalCode: "2205" },
  "Arndell Park": { prices: [80, 95, 110], postalCode: "2148" },
  "Artarmon": { prices: [240, 300, 400], postalCode: "2064" },
  "Ashbury": { prices: [270, 345, 455], postalCode: "2193" },
  "Ashcroft": { prices: [190, 240, 315], postalCode: "2168" },
  "Ashfield": { prices: [260, 325, 435], postalCode: "2131" },
  "Asquith": { prices: [160, 200, 260], postalCode: "2077" },
  "Auburn": { prices: [160, 200, 260], postalCode: "2144" },
  "Austral": { prices: [180, 230, 300], postalCode: "2179" },
  "Avalon": { prices: [350, 455, 600], postalCode: "2107" },
  "Badgerys Creek": { prices: [190, 240, 315], postalCode: "2555" },
  "Balgowlah": { prices: [330, 430, 575], postalCode: "2093" },
  "Balgowlah Heights": { prices: [330, 430, 575], postalCode: "2093" },
  "Balmain": { prices: [300, 390, 530], postalCode: "2041" },
  "Balmain East": { prices: [300, 390, 530], postalCode: "2041" },
  "Bangor": { prices: [370, 480, 630], postalCode: "2234" },
  "Banksia": { prices: [310, 405, 545], postalCode: "2216" },
  "Banksmeadow": { prices: [310, 405, 545], postalCode: "2019" },
  "Bankstown": { prices: [230, 290, 380], postalCode: "2200" },
  "Barangaroo": { prices: [300, 390, 530], postalCode: "2000" },
  "Barden Ridge": { prices: [380, 495, 645], postalCode: "2234" },
  "Bardia": { prices: [220, 280, 370], postalCode: "2565" },
  "Bardwell Park": { prices: [300, 390, 530], postalCode: "2207" },
  "Bardwell Valley": { prices: [300, 390, 530], postalCode: "2207" },
  "Bargo": { prices: [600, 805, 1080], postalCode: "2574" },
  "Bass Hill": { prices: [200, 250, 330], postalCode: "2197" },
  "Baulkham Hills": { prices: [75, 90, 105], postalCode: "2153" },
  "Bayview": { prices: [300, 390, 530], postalCode: "2104" },
  "Beacon Hill": { prices: [300, 390, 530], postalCode: "2100" },
  "Beaconsfield": { prices: [300, 390, 530], postalCode: "2015" },
  "Beaumont Hills": { prices: [55, 65, 75], postalCode: "2155" },
  "Beecroft": { prices: [110, 130, 165], postalCode: "2119" },
  "Belfield": { prices: [250, 315, 420], postalCode: "2191" },
  "Belimbla Park": { prices: [380, 495, 645], postalCode: "2570" },
  "Bell": { prices: [550, 735, 980], postalCode: "2786" },
  "Bella Vista": { prices: [70, 85, 100], postalCode: "2153" },
  "Bellevue Hill": { prices: [320, 415, 560], postalCode: "2023" },
  "Belmore": { prices: [260, 325, 435], postalCode: "2192" },
  "Belrose": { prices: [230, 290, 380], postalCode: "2085" },
  "Berala": { prices: [190, 240, 315], postalCode: "2141" },
  "Berambing": { prices: [200, 250, 330], postalCode: "2758" },
  "Berkshire Park": { prices: [55, 65, 75], postalCode: "2765" },
  "Berowra": { prices: [200, 250, 330], postalCode: "2081" },
  "Berowra Heights": { prices: [220, 280, 370], postalCode: "2082" },
  "Berowra Waters": { prices: [230, 290, 380], postalCode: "2082" },
  "Berrilee": { prices: [190, 240, 315], postalCode: "2159" },
  "Beverly Hills": { prices: [300, 390, 530], postalCode: "2209" },
  "Beverly Park": { prices: [330, 430, 575], postalCode: "2209" },
  "Bexley": { prices: [315, 410, 550], postalCode: "2207" },
  "Bexley North": { prices: [310, 405, 545], postalCode: "2207" },
  "Bickley Vale": { prices: [320, 415, 560], postalCode: "2570" },
  "Bidwill": { prices: [75, 90, 105], postalCode: "2770" },
  "Bilgola Beach": { prices: [340, 440, 585], postalCode: "2107" },
  "Bilgola Plateau": { prices: [340, 440, 585], postalCode: "2107" },
  "Bilpin": { prices: [160, 200, 260], postalCode: "2758" },
  "Bilpin-Mt Tootie Dirt": { prices: [260, 325, 435], postalCode: "2758" },
  "Bilpin-Mt Tootie Sealed": { prices: [180, 230, 300], postalCode: "2758" },
  "Birchgrove": { prices: [300, 390, 530], postalCode: "2041" },
  "Birrong": { prices: [200, 250, 330], postalCode: "2143" },
  "Blackett": { prices: [75, 90, 105], postalCode: "2770" },
  "Blackheath": { prices: [500, 660, 880], postalCode: "2785" },
  "Blacktown": { prices: [75, 90, 105], postalCode: "2148" },
  "Blair Athol": { prices: [250, 315, 420], postalCode: "2560" },
  "Blairmount": { prices: [250, 315, 420], postalCode: "2559" },
  "Blakehurst": { prices: [330, 430, 575], postalCode: "2221" },
  "Blaxland": { prices: [160, 200, 260], postalCode: "2774" },
  "Blaxland Ridge": { prices: [95, 115, 130], postalCode: "2758" },
  "Bligh Park": { prices: [50, 60, 70], postalCode: "2756" },
  "Bondi": { prices: [320, 415, 560], postalCode: "2026" },
  "Bondi Beach": { prices: [320, 415, 560], postalCode: "2026" },
  "Bondi Junction": { prices: [320, 415, 560], postalCode: "2022" },
  "Bonnet Bay": { prices: [380, 495, 645], postalCode: "2226" },
  "Bonnyrigg": { prices: [170, 215, 280], postalCode: "2177" },
  "Bonnyrigg Heights": { prices: [160, 200, 260], postalCode: "2177" },
  "Bossley Park": { prices: [130, 160, 200], postalCode: "2176" },
  "Botany": { prices: [310, 405, 545], postalCode: "2019" },
  "Bow Bowing": { prices: [250, 315, 420], postalCode: "2566" },
  "Bowen Mountain": { prices: [85, 100, 115], postalCode: "2753" },
  "Box Hill": { prices: [55, 65, 75], postalCode: "2765" },
  "Bradbury": { prices: [270, 345, 455], postalCode: "2560" },
  "Bradfield": { prices: [190, 240, 315], postalCode: "2077" },
  "Breakfast Point": { prices: [210, 265, 355], postalCode: "2137" },
  "Brighton-le-Sands": { prices: [320, 415, 560], postalCode: "2216" },
  "Bringelly": { prices: [190, 240, 315], postalCode: "2556" },
  "Bronte": { prices: [320, 415, 560], postalCode: "2024" },
  "Brooklyn": { prices: [400, 520, 680], postalCode: "2083" },
  "Brookvale": { prices: [300, 390, 530], postalCode: "2100" },
  "Brownlow Hill": { prices: [310, 405, 545], postalCode: "2570" },
  "Bullaburra": { prices: [320, 415, 560], postalCode: "2784" },
  "Bungarribee": { prices: [75, 90, 105], postalCode: "2767" },
  "Burraneer": { prices: [420, 550, 720], postalCode: "2230" },
  "Burwood": { prices: [230, 290, 380], postalCode: "2134" },
  "Burwood Heights": { prices: [230, 290, 380], postalCode: "2136" },
  "Busby": { prices: [180, 230, 300], postalCode: "2168" },
  "Cabarita": { prices: [210, 265, 355], postalCode: "2137" },
  "Cabramatta": { prices: [180, 230, 300], postalCode: "2166" },
  "Cabramatta West": { prices: [180, 230, 300], postalCode: "2166" },
  "Caddens": { prices: [80, 95, 110], postalCode: "2747" },
  "Cambridge Gardens": { prices: [75, 90, 105], postalCode: "2747" },
  "Cambridge Park": { prices: [75, 90, 105], postalCode: "2747" },
  "Camden": { prices: [280, 365, 480], postalCode: "2570" },
  "Camden Park": { prices: [300, 390, 530], postalCode: "2570" },
  "Camden South": { prices: [300, 390, 530], postalCode: "2570" },
  "Camellia": { prices: [130, 160, 200], postalCode: "2142" },
  "Cammeray": { prices: [290, 380, 500], postalCode: "2062" },
  "Campbelltown": { prices: [250, 315, 420], postalCode: "2560" },
  "Camperdown": { prices: [300, 390, 530], postalCode: "2050" },
  "Campsie": { prices: [280, 365, 480], postalCode: "2194" },
  "Canada Bay": { prices: [230, 290, 380], postalCode: "2046" },
  "Canley Heights": { prices: [170, 215, 280], postalCode: "2166" },
  "Canley Vale": { prices: [180, 230, 300], postalCode: "2166" },
  "Canoelands": { prices: [200, 250, 330], postalCode: "2157" },
  "Canterbury": { prices: [290, 380, 500], postalCode: "2193" },
  "Caringbah": { prices: [390, 510, 660], postalCode: "2229" },
  "Caringbah South": { prices: [400, 520, 680], postalCode: "2229" },
  "Carlingford": { prices: [115, 140, 175], postalCode: "2118" },
  "Carlton": { prices: [315, 410, 550], postalCode: "2218" },
  "Carnes Hill": { prices: [180, 230, 300], postalCode: "2171" },
  "Carramar": { prices: [170, 215, 280], postalCode: "2163" },
  "Carss Park": { prices: [330, 430, 575], postalCode: "2221" },
  "Cartwright": { prices: [190, 240, 315], postalCode: "2168" },
  "Castle Cove": { prices: [280, 365, 480], postalCode: "2069" },
  "Castle Hill": { prices: [75, 90, 105], postalCode: "2154" },
  "Castlecrag": { prices: [290, 380, 500], postalCode: "2068" },
  "Castlereagh": { prices: [70, 85, 100], postalCode: "2749" },
  "Casula": { prices: [210, 265, 355], postalCode: "2170" },
  "Catherine Field": { prices: [240, 300, 400], postalCode: "2557" },
  "Cattai": { prices: [90, 110, 125], postalCode: "2756" },
  "Cawdor": { prices: [320, 415, 560], postalCode: "2570" },
  "CBD": { prices: [300, 390, 530], postalCode: "2000" },
  "Cecil Hills": { prices: [150, 180, 230], postalCode: "2171" },
  "Cecil Park": { prices: [150, 180, 230], postalCode: "2178" },
  "Centennial Park": { prices: [310, 405, 545], postalCode: "2021" },
  "Central Colo": { prices: [280, 365, 480], postalCode: "2756" },
  "Central Macdonald": { prices: [480, 625, 840], postalCode: "2775" },
  "Chatswood": { prices: [230, 290, 380], postalCode: "2067" },
  "Chatswood West": { prices: [220, 280, 370], postalCode: "2067" },
  "Cheltenham": { prices: [115, 140, 175], postalCode: "2119" },
  "Cherrybrook": { prices: [80, 95, 110], postalCode: "2126" },
  "Chester Hill": { prices: [180, 230, 300], postalCode: "2162" },
  "Chifley": { prices: [340, 440, 585], postalCode: "2036" },
  "Chippendale": { prices: [300, 390, 530], postalCode: "2008" },
  "Chipping Norton": { prices: [200, 250, 330], postalCode: "2170" },
  "Chiswick": { prices: [270, 345, 455], postalCode: "2046" },
  "Chullora": { prices: [210, 265, 355], postalCode: "2190" },
  "Church Point": { prices: [330, 430, 575], postalCode: "2105" },
  "Claremont Meadows": { prices: [80, 95, 110], postalCode: "2747" },
  "Clarendon": { prices: [50, 60, 70], postalCode: "2756" },
  "Clareville": { prices: [350, 455, 600], postalCode: "2107" },
  "Claymore": { prices: [250, 315, 420], postalCode: "2559" },
  "Clemton Park": { prices: [290, 380, 500], postalCode: "2206" },
  "Clontarf": { prices: [330, 430, 575], postalCode: "2093" },
  "Clovelly": { prices: [320, 415, 560], postalCode: "2031" },
  "Clyde": { prices: [150, 180, 230], postalCode: "2142" },
  "Cobbitty": { prices: [280, 365, 480], postalCode: "2570" },
  "Colebee": { prices: [70, 85, 100], postalCode: "2761" },
  "Collaroy": { prices: [320, 415, 560], postalCode: "2097" },
  "Collaroy Plateau": { prices: [320, 415, 560], postalCode: "2097" },
  "Colo": { prices: [220, 280, 370], postalCode: "2756" },
  "Colo Heights": { prices: [280, 365, 480], postalCode: "2756" },
  "Colo-Central": { prices: [280, 365, 480], postalCode: "2756" },
  "Colo-Upper": { prices: [330, 430, 575], postalCode: "2756" },
  "Colyton": { prices: [85, 100, 115], postalCode: "2760" },
  "Como": { prices: [380, 495, 645], postalCode: "2226" },
  "Concord": { prices: [200, 250, 330], postalCode: "2137" },
  "Concord West": { prices: [200, 250, 330], postalCode: "2138" },
  "Condell Park": { prices: [220, 280, 370], postalCode: "2200" },
  "Connells Point": { prices: [330, 430, 575], postalCode: "2221" },
  "Constitution Hill": { prices: [100, 120, 140], postalCode: "2145" },
  "Coogee": { prices: [320, 415, 560], postalCode: "2034" },
  "Cornwallis": { prices: [55, 65, 75], postalCode: "2756" },
  "Cottage Point": { prices: [400, 520, 680], postalCode: "2084" },
  "Couridjah": { prices: [580, 780, 1040], postalCode: "2571" },
  "Cowan": { prices: [300, 390, 530], postalCode: "2081" },
  "Cranebrook": { prices: [70, 85, 100], postalCode: "2749" },
  "Cremorne": { prices: [300, 390, 530], postalCode: "2090" },
  "Cremorne Point": { prices: [300, 390, 530], postalCode: "2090" },
  "Cromer": { prices: [320, 415, 560], postalCode: "2099" },
  "Cronulla": { prices: [420, 550, 720], postalCode: "2230" },
  "Crows Nest": { prices: [280, 365, 480], postalCode: "2065" },
  "Croydon": { prices: [240, 300, 400], postalCode: "2132" },
  "Croydon Park": { prices: [250, 315, 420], postalCode: "2133" },
  "Cumberland Reach": { prices: [200, 250, 330], postalCode: "2756" },
  "Curl Curl": { prices: [350, 455, 600], postalCode: "2096" },
  "Currans Hill": { prices: [250, 315, 420], postalCode: "2567" },
  "Daceyville": { prices: [310, 405, 545], postalCode: "2032" },
  "Darling Point": { prices: [310, 405, 545], postalCode: "2027" },
  "Darlinghurst": { prices: [300, 390, 530], postalCode: "2010" },
  "Darlington": { prices: [300, 390, 530], postalCode: "2008" },
  "Davidson": { prices: [290, 380, 500], postalCode: "2085" },
  "Dawes Point": { prices: [300, 390, 530], postalCode: "2000" },
  "Dean Park": { prices: [75, 90, 105], postalCode: "2761" },
  "Dee Why": { prices: [330, 430, 575], postalCode: "2099" },
  "Denham Court": { prices: [220, 280, 370], postalCode: "2565" },
  "Denistone": { prices: [160, 200, 260], postalCode: "2114" },
  "Denistone East": { prices: [160, 200, 260], postalCode: "2112" },
  "Denistone West": { prices: [160, 200, 260], postalCode: "2114" },
  "Dharruk": { prices: [75, 90, 105], postalCode: "2770" },
  "Dolans Bay": { prices: [420, 550, 720], postalCode: "2229" },
  "Dolls Point": { prices: [330, 430, 575], postalCode: "2219" },
  "Doonside": { prices: [75, 90, 105], postalCode: "2767" },
  "Double Bay": { prices: [320, 415, 560], postalCode: "2028" },
  "Douglas Park": { prices: [420, 550, 720], postalCode: "2569" },
  "Dover Heights": { prices: [330, 430, 575], postalCode: "2030" },
  "Drummoyne": { prices: [270, 345, 455], postalCode: "2047" },
  "Duffys Forest": { prices: [240, 300, 400], postalCode: "2084" },
  "Dulwich Hill": { prices: [290, 380, 500], postalCode: "2203" },
  "Dundas": { prices: [140, 170, 215], postalCode: "2117" },
  "Dundas Valley": { prices: [140, 170, 215], postalCode: "2117" },
  "Dunheved": { prices: [75, 90, 105], postalCode: "2760" },
  "Dural": { prices: [100, 120, 140], postalCode: "2158" },
  "Dural - Middle": { prices: [110, 130, 165], postalCode: "2158" },
  "Eagle Vale": { prices: [250, 315, 420], postalCode: "2558" },
  "Earlwood": { prices: [300, 390, 530], postalCode: "2206" },
  "East Hills": { prices: [260, 325, 435], postalCode: "2213" },
  "East Killara": { prices: [210, 265, 355], postalCode: "2071" },
  "East Kurrajong": { prices: [85, 100, 115], postalCode: "2758" },
  "East Lakes": { prices: [310, 405, 545], postalCode: "2018" },
  "East Lindfield": { prices: [240, 300, 400], postalCode: "2070" },
  "East Ryde": { prices: [185, 235, 305], postalCode: "2113" },
  "Eastern Creek": { prices: [90, 110, 125], postalCode: "2766" },
  "Eastgardens": { prices: [310, 405, 545], postalCode: "2036" },
  "Eastwood": { prices: [150, 180, 230], postalCode: "2122" },
  "Ebenezer": { prices: [75, 90, 105], postalCode: "2756" },
  "Edensor Park": { prices: [150, 180, 230], postalCode: "2176" },
  "Edgecliff": { prices: [310, 405, 545], postalCode: "2027" },
  "Edmondson Park": { prices: [210, 265, 355], postalCode: "2174" },
  "Elanora Heights": { prices: [310, 405, 545], postalCode: "2101" },
  "Elderslie": { prices: [270, 345, 455], postalCode: "2570" },
  "Elizabeth Bay": { prices: [300, 390, 530], postalCode: "2011" },
  "Elizabeth Hills": { prices: [170, 215, 280], postalCode: "2171" },
  "Ellis Lane": { prices: [310, 405, 545], postalCode: "2570" },
  "Emerton": { prices: [75, 90, 105], postalCode: "2770" },
  "Emu Heights": { prices: [115, 140, 175], postalCode: "2750" },
  "Emu Plains": { prices: [85, 100, 115], postalCode: "2750" },
  "Enfield": { prices: [240, 300, 400], postalCode: "2136" },
  "Engadine": { prices: [420, 550, 720], postalCode: "2233" },
  "Englorie Park": { prices: [270, 345, 455], postalCode: "2560" },
  "Enmore": { prices: [300, 390, 530], postalCode: "2042" },
  "Epping": { prices: [125, 150, 190], postalCode: "2121" },
  "Ermington": { prices: [150, 180, 230], postalCode: "2115" },
  "Erskine Park": { prices: [105, 125, 160], postalCode: "2759" },
  "Erskineville": { prices: [300, 390, 530], postalCode: "2043" },
  "Eschol Park": { prices: [250, 315, 420], postalCode: "2558" },
  "Eveleigh": { prices: [300, 390, 530], postalCode: "2015" },
  "Fairfield": { prices: [165, 210, 270], postalCode: "2165" },
  "Fairfield East": { prices: [165, 210, 270], postalCode: "2165" },
  "Fairfield Heights": { prices: [155, 190, 245], postalCode: "2165" },
  "Fairfield West": { prices: [150, 180, 230], postalCode: "2165" },
  "Fairlight": { prices: [340, 440, 585], postalCode: "2094" },
  "Faulconbridge": { prices: [200, 250, 330], postalCode: "2776" },
  "Fiddletown": { prices: [190, 240, 315], postalCode: "2159" },
  "Five Dock": { prices: [260, 325, 435], postalCode: "2046" },
  "Flemington": { prices: [200, 250, 330], postalCode: "2140" },
  "Forest Glen": { prices: [180, 230, 300], postalCode: "2157" },
  "Forest Lodge": { prices: [300, 390, 530], postalCode: "2037" },
  "Forestville": { prices: [270, 345, 455], postalCode: "2087" },
  "Freemans Reach": { prices: [70, 85, 100], postalCode: "2756" },
  "Frenchs Forest": { prices: [280, 365, 480], postalCode: "2086" },
  "Freshwater": { prices: [350, 455, 600], postalCode: "2096" },
  "Galston": { prices: [120, 145, 180], postalCode: "2159" },
  "Georges Hall": { prices: [200, 250, 330], postalCode: "2198" },
  "Gilead": { prices: [340, 440, 585], postalCode: "2560" },
  "Girraween": { prices: [95, 115, 130], postalCode: "2145" },
  "Gladesville": { prices: [200, 250, 330], postalCode: "2111" },
  "Glebe": { prices: [300, 390, 530], postalCode: "2037" },
  "Gledswood Hills": { prices: [240, 300, 400], postalCode: "2557" },
  "Glen Alpine": { prices: [290, 380, 500], postalCode: "2560" },
  "Glenbrook": { prices: [135, 165, 205], postalCode: "2773" },
  "Glendenning": { prices: [75, 90, 105], postalCode: "2761" },
  "Glenfield": { prices: [230, 290, 380], postalCode: "2167" },
  "Glenhaven": { prices: [70, 85, 100], postalCode: "2156" },
  "Glenmore": { prices: [350, 455, 600], postalCode: "2570" },
  "Glenmore Park": { prices: [100, 120, 140], postalCode: "2745" },
  "Glenorie": { prices: [150, 180, 230], postalCode: "2157" },
  "Glenwood": { prices: [65, 75, 85], postalCode: "2768" },
  "Glossodia": { prices: [75, 90, 105], postalCode: "2756" },
  "Gordon": { prices: [185, 235, 305], postalCode: "2072" },
  "Grantham Farm": { prices: [60, 70, 80], postalCode: "2756" },
  "Granville": { prices: [140, 170, 215], postalCode: "2142" },
  "Grasmere": { prices: [310, 405, 545], postalCode: "2570" },
  "Grays Point": { prices: [420, 550, 720], postalCode: "2232" },
  "Green Hills Beach": { prices: [420, 550, 720], postalCode: "2230" },
  "Green Valley": { prices: [170, 215, 280], postalCode: "2168" },
  "Greenacre": { prices: [230, 290, 380], postalCode: "2190" },
  "Greendale": { prices: [200, 250, 330], postalCode: "2550" },
  "Greenfield Park": { prices: [160, 200, 260], postalCode: "2176" },
  "Greenwich": { prices: [280, 365, 480], postalCode: "2065" },
  "Gregory Hills": { prices: [250, 315, 420], postalCode: "2557" },
  "Greystanes": { prices: [100, 120, 140], postalCode: "2145" },
  "Grose Vale": { prices: [75, 90, 105], postalCode: "2753" },
  "Grose Wold": { prices: [75, 90, 105], postalCode: "2753" },
  "Guildford": { prices: [155, 190, 245], postalCode: "2161" },
  "Guildford West": { prices: [155, 190, 245], postalCode: "2161" },
  "Gunderman": { prices: [450, 585, 780], postalCode: "2775" },
  "Gymea": { prices: [400, 520, 680], postalCode: "2227" },
  "Gymea Bay": { prices: [400, 520, 680], postalCode: "2227" },
  "Haberfield": { prices: [280, 365, 480], postalCode: "2045" },
  "Hammondville": { prices: [250, 315, 420], postalCode: "2170" },
  "Harrington Park": { prices: [250, 315, 420], postalCode: "2567" },
  "Harris Park": { prices: [130, 160, 200], postalCode: "2150" },
  "Hassall Grove": { prices: [75, 90, 105], postalCode: "2761" },
  "Hawkesbury Heights": { prices: [140, 170, 215], postalCode: "2777" },
  "Haymarket": { prices: [300, 390, 530], postalCode: "2000" },
  "Hazelbrook": { prices: [280, 365, 480], postalCode: "2779" },
  "Heathcote": { prices: [450, 585, 780], postalCode: "2233" },
  "Hebersham": { prices: [75, 90, 105], postalCode: "2770" },
  "Heckenberg": { prices: [180, 230, 300], postalCode: "2168" },
  "Henley": { prices: [240, 300, 400], postalCode: "2111" },
  "Hillsdale": { prices: [320, 415, 560], postalCode: "2036" },
  "Hinchinbrook": { prices: [180, 230, 300], postalCode: "2168" },
  "Hobartville": { prices: [50, 60, 70], postalCode: "2753" },
  "Holroyd": { prices: [130, 160, 200], postalCode: "2142" },
  "Holsworthy": { prices: [260, 325, 435], postalCode: "2173" },
  "Homebush": { prices: [200, 250, 330], postalCode: "2140" },
  "Homebush West": { prices: [200, 250, 330], postalCode: "2140" },
  "Horningsea Park": { prices: [190, 240, 315], postalCode: "2171" },
  "Hornsby": { prices: [150, 180, 230], postalCode: "2077" },
  "Hornsby Heights": { prices: [170, 215, 280], postalCode: "2077" },
  "Horsley Park": { prices: [110, 130, 165], postalCode: "2175" },
  "Hoxton Park": { prices: [180, 230, 300], postalCode: "2171" },
  "Hunters Hill": { prices: [240, 300, 400], postalCode: "2110" },
  "Huntingwood": { prices: [90, 110, 125], postalCode: "2148" },
  "Huntleys Cove": { prices: [240, 300, 400], postalCode: "2111" },
  "Huntleys Point": { prices: [240, 300, 400], postalCode: "2111" },
  "Hurlstone Park": { prices: [290, 380, 500], postalCode: "2193" },
  "Hurstville": { prices: [315, 410, 550], postalCode: "2220" },
  "Hurstville Grove": { prices: [330, 430, 575], postalCode: "2220" },
  "Illawong": { prices: [350, 455, 600], postalCode: "2234" },
  "Ingleburn": { prices: [230, 290, 380], postalCode: "2565" },
  "Ingleside": { prices: [290, 380, 500], postalCode: "2101" },
  "Jamisontown": { prices: [85, 100, 115], postalCode: "2750" },
  "Jannali": { prices: [380, 495, 645], postalCode: "2226" },
  "Jordan Springs": { prices: [70, 85, 100], postalCode: "2747" },
  "Kangaroo Point": { prices: [390, 510, 660], postalCode: "2224" },
  "Kareela": { prices: [380, 495, 645], postalCode: "2232" },
  "Katoomba": { prices: [400, 520, 680], postalCode: "2780" },
  "Kearns": { prices: [250, 315, 420], postalCode: "2558" },
  "Kellyville": { prices: [60, 70, 80], postalCode: "2155" },
  "Kellyville Ridge": { prices: [55, 65, 75], postalCode: "2155" },
  "Kemps Creek": { prices: [170, 215, 280], postalCode: "2178" },
  "Kensington": { prices: [300, 390, 530], postalCode: "2033" },
  "Kenthurst": { prices: [85, 100, 115], postalCode: "2156" },
  "Kentlyn": { prices: [270, 345, 455], postalCode: "2560" },
  "Killara": { prices: [200, 250, 330], postalCode: "2071" },
  "Killarney Heights": { prices: [290, 380, 500], postalCode: "2087" },
  "Kings Langley": { prices: [70, 85, 100], postalCode: "2147" },
  "Kings Park": { prices: [70, 85, 100], postalCode: "2148" },
  "Kingsford": { prices: [310, 405, 545], postalCode: "2032" },
  "Kingsgrove": { prices: [300, 390, 530], postalCode: "2208" },
  "Kingswood": { prices: [80, 95, 110], postalCode: "2747" },
  "Kirkham": { prices: [260, 325, 435], postalCode: "2570" },
  "Kirrawee": { prices: [390, 510, 660], postalCode: "2232" },
  "Kirribilli": { prices: [300, 390, 530], postalCode: "2061" },
  "Kogarah": { prices: [330, 430, 575], postalCode: "2217" },
  "Kogarah Bay": { prices: [330, 430, 575], postalCode: "2217" },
  "Kurmond": { prices: [70, 85, 100], postalCode: "2757" },
  "Kurnell": { prices: [450, 585, 780], postalCode: "2231" },
  "Kurraba Point": { prices: [300, 390, 530], postalCode: "2089" },
  "Kurrajong": { prices: [80, 95, 110], postalCode: "2758" },
  "Kurrajong Heights": { prices: [90, 110, 125], postalCode: "2758" },
  "Kurrajong Hills": { prices: [85, 100, 115], postalCode: "2758" },
  "Kurrajong-East": { prices: [85, 100, 115], postalCode: "2758" },
  "Kyeemagh": { prices: [320, 415, 560], postalCode: "2216" },
  "Kyle Bay": { prices: [330, 430, 575], postalCode: "2221" },
  "La Perouse": { prices: [350, 455, 600], postalCode: "2036" },
  "Lakemba": { prices: [250, 315, 420], postalCode: "2195" },
  "Lakesland": { prices: [580, 780, 1040], postalCode: "2572" },
  "Lalor Park": { prices: [70, 85, 100], postalCode: "2147" },
  "Lane Cove": { prices: [200, 250, 330], postalCode: "2066" },
  "Lane Cove North": { prices: [200, 250, 330], postalCode: "2066" },
  "Lane Cove West": { prices: [200, 250, 330], postalCode: "2066" },
  "Lansdowne": { prices: [180, 230, 300], postalCode: "2163" },
  "Lansvale": { prices: [180, 230, 300], postalCode: "2166" },
  "Lapstone": { prices: [135, 165, 205], postalCode: "2773" },
  "Laughtondale": { prices: [290, 380, 500], postalCode: "2775" },
  "Lavender Bay": { prices: [300, 390, 530], postalCode: "2060" },
  "Lawson": { prices: [300, 390, 530], postalCode: "2783" },
  "Leets Vale North Side": { prices: [500, 660, 880], postalCode: "2775" },
  "Leets Vale Sydney Side": { prices: [230, 290, 380], postalCode: "2775" },
  "Leichhardt": { prices: [290, 380, 500], postalCode: "2040" },
  "Len Water Estate": { prices: [180, 230, 300], postalCode: "2756" },
  "Leonay": { prices: [100, 120, 140], postalCode: "2750" },
  "Leppington": { prices: [220, 280, 370], postalCode: "2179" },
  "Lethbridge Park": { prices: [75, 90, 105], postalCode: "2770" },
  "Leumeah": { prices: [250, 315, 420], postalCode: "2560" },
  "Leura": { prices: [380, 495, 645], postalCode: "2780" },
  "Lewisham": { prices: [290, 380, 500], postalCode: "2049" },
  "Liberty Grove": { prices: [200, 250, 330], postalCode: "2138" },
  "Lidcombe": { prices: [180, 230, 300], postalCode: "2141" },
  "Lilli Pilli": { prices: [420, 550, 720], postalCode: "2229" },
  "Lilyfield": { prices: [290, 380, 500], postalCode: "2040" },
  "Linden": { prices: [230, 290, 380], postalCode: "2778" },
  "Lindfield": { prices: [220, 280, 370], postalCode: "2070" },
  "Linley Point": { prices: [230, 290, 380], postalCode: "2066" },
  "Little Bay": { prices: [350, 455, 600], postalCode: "2036" },
  "Liverpool": { prices: [190, 240, 315], postalCode: "2170" },
  "Llandilo": { prices: [70, 85, 100], postalCode: "2747" },
  "Loftus": { prices: [420, 550, 720], postalCode: "2232" },
  "Londonderry": { prices: [50, 60, 70], postalCode: "2753" },
  "Long Point": { prices: [240, 300, 400], postalCode: "2564" },
  "Longueville": { prices: [260, 325, 435], postalCode: "2066" },
  "Lower MacDonald": { prices: [400, 520, 680], postalCode: "2775" },
  "Lower Portland": { prices: [200, 250, 330], postalCode: "2756" },
  "Lucas Heights": { prices: [400, 520, 680], postalCode: "2234" },
  "Luddenham": { prices: [170, 215, 280], postalCode: "2745" },
  "Lugarno": { prices: [310, 405, 545], postalCode: "2210" },
  "Lurnea": { prices: [200, 250, 330], postalCode: "2170" },
  "Macquarie Fields": { prices: [230, 290, 380], postalCode: "2564" },
  "Macquarie Links": { prices: [230, 290, 380], postalCode: "2565" },
  "Macquarie Park": { prices: [170, 215, 280], postalCode: "2113" },
  "Malabar": { prices: [340, 440, 585], postalCode: "2036" },
  "Manly": { prices: [350, 455, 600], postalCode: "2095" },
  "Manly Vale": { prices: [330, 430, 575], postalCode: "2093" },
  "Maraylya": { prices: [75, 90, 105], postalCode: "2765" },
  "Marayong": { prices: [75, 90, 105], postalCode: "2148" },
  "Maroota": { prices: [155, 190, 245], postalCode: "2756" },
  "Maroota-South": { prices: [135, 165, 205], postalCode: "2756" },
  "Maroubra": { prices: [320, 415, 560], postalCode: "2035" },
  "Marrickville": { prices: [300, 390, 530], postalCode: "2204" },
  "Marsden Park": { prices: [60, 70, 80], postalCode: "2765" },
  "Marsfield": { prices: [150, 180, 230], postalCode: "2122" },
  "Mascot": { prices: [300, 390, 530], postalCode: "2020" },
  "Matraville": { prices: [320, 415, 560], postalCode: "2036" },
  "Mays Hill": { prices: [120, 145, 180], postalCode: "2145" },
  "McGraths Hill": { prices: [60, 70, 80], postalCode: "2756" },
  "McMahons Point": { prices: [300, 390, 530], postalCode: "2060" },
  "Meadowbank": { prices: [170, 215, 280], postalCode: "2114" },
  "Medlow Bath": { prices: [450, 585, 780], postalCode: "2780" },
  "Melonba": { prices: [65, 75, 85], postalCode: "2765" },
  "Melrose Park": { prices: [170, 215, 280], postalCode: "2114" },
  "Menai": { prices: [360, 470, 620], postalCode: "2234" },
  "Menangle": { prices: [320, 415, 560], postalCode: "2568" },
  "Menangle Park": { prices: [320, 415, 560], postalCode: "2563" },
  "Merrylands": { prices: [130, 160, 200], postalCode: "2160" },
  "Merrylands West": { prices: [130, 160, 200], postalCode: "2160" },
  "Middle Cove": { prices: [290, 380, 500], postalCode: "2068" },
  "Middle Dural": { prices: [110, 130, 165], postalCode: "2158" },
  "Middleton Grange": { prices: [180, 230, 300], postalCode: "2171" },
  "Miller": { prices: [180, 230, 300], postalCode: "2168" },
  "Millers Point": { prices: [300, 390, 530], postalCode: "2000" },
  "Milperra": { prices: [230, 290, 380], postalCode: "2214" },
  "Milsons Point": { prices: [300, 390, 530], postalCode: "2061" },
  "Minchinbury": { prices: [85, 100, 115], postalCode: "2770" },
  "Minto": { prices: [250, 315, 420], postalCode: "2566" },
  "Minto Heights": { prices: [260, 325, 435], postalCode: "2566" },
  "Miranda": { prices: [400, 520, 680], postalCode: "2228" },
  "Mona Vale": { prices: [300, 390, 530], postalCode: "2103" },
  "Monterey": { prices: [320, 415, 560], postalCode: "2217" },
  "Mooney Mooney": { prices: [400, 520, 680], postalCode: "2083" },
  "Mooney Mooney Creek": { prices: [400, 520, 680], postalCode: "2083" },
  "Moore Park": { prices: [300, 390, 530], postalCode: "2021" },
  "Moorebank": { prices: [220, 280, 370], postalCode: "2170" },
  "Mortdale": { prices: [315, 410, 550], postalCode: "2223" },
  "Mortlake": { prices: [210, 265, 355], postalCode: "2137" },
  "Mosman": { prices: [300, 390, 530], postalCode: "2088" },
  "Mount Annan": { prices: [250, 315, 420], postalCode: "2567" },
  "Mount Colah": { prices: [180, 230, 300], postalCode: "2079" },
  "Mount Druitt": { prices: [75, 90, 105], postalCode: "2770" },
  "Mount Hunter": { prices: [340, 440, 585], postalCode: "2570" },
  "Mount Irvine": { prices: [550, 735, 980], postalCode: "2786" },
  "Mount Ku-ring-Gai": { prices: [190, 240, 315], postalCode: "2080" },
  "Mount Lewis": { prices: [230, 290, 380], postalCode: "2190" },
  "Mount Pritchard": { prices: [180, 230, 300], postalCode: "2170" },
  "Mount Riverview": { prices: [175, 225, 295], postalCode: "2774" },
  "Mount Tomah": { prices: [220, 280, 370], postalCode: "2758" },
  "Mount Vernon": { prices: [160, 200, 260], postalCode: "2178" },
  "Mount Victoria": { prices: [550, 735, 980], postalCode: "2786" },
  "Mount Wilson": { prices: [500, 660, 880], postalCode: "2786" },
  "Mountain Lagoon": { prices: [220, 280, 370], postalCode: "2758" },
  "Mowbray Park": { prices: [580, 780, 1040], postalCode: "2580" },
  "Mulgoa": { prices: [140, 170, 215], postalCode: "2745" },
  "Mulgoa Rise": { prices: [100, 120, 140], postalCode: "2745" },
  "Mulgrave": { prices: [60, 70, 80], postalCode: "2756" },
  "Narellan": { prices: [250, 315, 420], postalCode: "2567" },
  "Narellan Vale": { prices: [260, 325, 435], postalCode: "2567" },
  "Naremburn": { prices: [260, 325, 435], postalCode: "2065" },
  "Narrabeen": { prices: [320, 415, 560], postalCode: "2101" },
  "Narraweena": { prices: [300, 390, 530], postalCode: "2099" },
  "Narwee": { prices: [290, 380, 500], postalCode: "2209" },
  "Nelson": { prices: [55, 65, 75], postalCode: "2765" },
  "Neutral Bay": { prices: [300, 390, 530], postalCode: "2089" },
  "Newington": { prices: [170, 215, 280], postalCode: "2127" },
  "Newport": { prices: [330, 430, 575], postalCode: "2106" },
  "Newtown": { prices: [300, 390, 530], postalCode: "2042" },
  "Nirimba Fields": { prices: [75, 90, 105], postalCode: "2763" },
  "Normanhurst": { prices: [120, 145, 180], postalCode: "2076" },
  "North Balgowlah": { prices: [330, 430, 575], postalCode: "2093" },
  "North Bondi": { prices: [320, 415, 560], postalCode: "2026" },
  "North Curl Curl": { prices: [350, 455, 600], postalCode: "2099" },
  "North Epping": { prices: [140, 170, 215], postalCode: "2121" },
  "North Manly": { prices: [330, 430, 575], postalCode: "2100" },
  "North Narrabeen": { prices: [320, 415, 560], postalCode: "2101" },
  "North Parramatta": { prices: [110, 130, 165], postalCode: "2151" },
  "North Richmond": { prices: [60, 70, 80], postalCode: "2754" },
  "North Rocks": { prices: [115, 140, 175], postalCode: "2151" },
  "North Ryde": { prices: [170, 215, 280], postalCode: "2113" },
  "North St Marys": { prices: [75, 90, 105], postalCode: "2760" },
  "North Strathfield": { prices: [210, 265, 355], postalCode: "2137" },
  "North Sydney": { prices: [300, 390, 530], postalCode: "2060" },
  "North Turramurra": { prices: [180, 230, 300], postalCode: "2074" },
  "North Wahroonga": { prices: [160, 200, 260], postalCode: "2076" },
  "North Willoughby": { prices: [270, 345, 455], postalCode: "2068" },
  "Northbridge": { prices: [290, 380, 500], postalCode: "2063" },
  "Northmead": { prices: [95, 115, 130], postalCode: "2152" },
  "Northwood": { prices: [260, 325, 435], postalCode: "2066" },
  "Norwest": { prices: [70, 85, 100], postalCode: "2153" },
  "Oakdale": { prices: [400, 520, 680], postalCode: "2570" },
  "Oakhurst": { prices: [75, 90, 105], postalCode: "2761" },
  "Oakville": { prices: [65, 75, 85], postalCode: "2765" },
  "Oatlands": { prices: [120, 145, 180], postalCode: "2117" },
  "Oatley": { prices: [315, 410, 550], postalCode: "2223" },
  "Old Guildford": { prices: [165, 210, 270], postalCode: "2161" },
  "Old Toongabbie": { prices: [90, 110, 125], postalCode: "2146" },
  "Oran Park": { prices: [240, 300, 400], postalCode: "2570" },
  "Orangeville": { prices: [360, 470, 620], postalCode: "2570" },
  "Orchard Hills": { prices: [100, 120, 140], postalCode: "2748" },
  "Orchard Hills - Defence": { prices: [160, 200, 260], postalCode: "2748" },
  "Osborne Park": { prices: [240, 300, 400], postalCode: "2570" },
  "Oxford Falls": { prices: [290, 380, 500], postalCode: "2100" },
  "Oxley Park": { prices: [80, 95, 110], postalCode: "2760" },
  "Oyster Bay": { prices: [380, 495, 645], postalCode: "2225" },
  "Paddington": { prices: [300, 390, 530], postalCode: "2021" },
  "Padstow": { prices: [280, 365, 480], postalCode: "2211" },
  "Padstow Heights": { prices: [280, 365, 480], postalCode: "2211" },
  "Pagewood": { prices: [310, 405, 545], postalCode: "2035" },
  "Palm Beach": { prices: [360, 470, 620], postalCode: "2108" },
  "Panania": { prices: [260, 325, 435], postalCode: "2213" },
  "Parklea": { prices: [65, 75, 85], postalCode: "2768" },
  "Parramatta": { prices: [120, 145, 180], postalCode: "2150" },
  "Peakhurst": { prices: [300, 390, 530], postalCode: "2210" },
  "Peakhurst Heights": { prices: [300, 390, 530], postalCode: "2210" },
  "Pemulwuy": { prices: [100, 120, 140], postalCode: "2145" },
  "Pendle Hill": { prices: [100, 120, 140], postalCode: "2145" },
  "Pennant Hills": { prices: [105, 125, 160], postalCode: "2120" },
  "Penrith": { prices: [75, 90, 105], postalCode: "2750" },
  "Penrith-South": { prices: [80, 95, 110], postalCode: "2750" },
  "Penshurst": { prices: [315, 410, 550], postalCode: "2222" },
  "Petersham": { prices: [290, 380, 500], postalCode: "2049" },
  "Pheasants Nest": { prices: [600, 805, 1080], postalCode: "2574" },
  "Phillip Bay": { prices: [340, 440, 585], postalCode: "2036" },
  "Picnic Point": { prices: [270, 345, 455], postalCode: "2213" },
  "Picton": { prices: [480, 625, 840], postalCode: "2571" },
  "Pitt Town": { prices: [70, 85, 100], postalCode: "2756" },
  "Pitt Town Bottoms": { prices: [70, 85, 100], postalCode: "2756" },
  "Pleasure Point": { prices: [260, 325, 435], postalCode: "2172" },
  "Plumpton": { prices: [75, 90, 105], postalCode: "2761" },
  "Point Piper": { prices: [320, 415, 560], postalCode: "2027" },
  "Port Botany": { prices: [320, 415, 560], postalCode: "2036" },
  "Potts Hill": { prices: [200, 250, 330], postalCode: "2143" },
  "Potts Point": { prices: [300, 390, 530], postalCode: "2011" },
  "Prairiewood": { prices: [140, 170, 215], postalCode: "2176" },
  "Prestons": { prices: [190, 240, 315], postalCode: "2170" },
  "Prospect": { prices: [85, 100, 115], postalCode: "2148" },
  "Punchbowl": { prices: [240, 300, 400], postalCode: "2196" },
  "Putney": { prices: [190, 240, 315], postalCode: "2112" },
  "Pymble": { prices: [175, 225, 295], postalCode: "2073" },
  "Pyrmont": { prices: [300, 390, 530], postalCode: "2009" },
  "Quakers Hill": { prices: [65, 75, 85], postalCode: "2763" },
  "Queens Park": { prices: [320, 415, 560], postalCode: "2022" },
  "Queenscliff": { prices: [350, 455, 600], postalCode: "2096" },
  "Raby": { prices: [250, 315, 420], postalCode: "2566" },
  "Ramsgate": { prices: [330, 430, 575], postalCode: "2217" },
  "Ramsgate Beach": { prices: [330, 430, 575], postalCode: "2217" },
  "Randwick": { prices: [310, 405, 545], postalCode: "2031" },
  "Razorback": { prices: [480, 625, 840], postalCode: "2571" },
  "Redfern": { prices: [300, 390, 530], postalCode: "2016" },
  "Regents Park": { prices: [190, 240, 315], postalCode: "2143" },
  "Regentville": { prices: [95, 115, 130], postalCode: "2745" },
  "Revesby": { prices: [270, 345, 455], postalCode: "2212" },
  "Revesby Heights": { prices: [270, 345, 455], postalCode: "2212" },
  "Rhodes": { prices: [190, 240, 315], postalCode: "2138" },
  "Richards": { prices: [60, 70, 80], postalCode: "2756" },
  "Richmond": { prices: [50, 60, 70], postalCode: "2753" },
  "Richmond Lowlands": { prices: [55, 65, 75], postalCode: "2753" },
  "Richmond RAAF": { prices: [110, 130, 165], postalCode: "2755" },
  "Richmond-North": { prices: [60, 70, 80], postalCode: "2753" },
  "Riverstone": { prices: [60, 70, 80], postalCode: "2765" },
  "Riverview": { prices: [230, 290, 380], postalCode: "2066" },
  "Riverwood": { prices: [290, 380, 500], postalCode: "2210" },
  "Rockdale": { prices: [315, 410, 550], postalCode: "2216" },
  "Rodd Point": { prices: [270, 345, 455], postalCode: "2046" },
  "Rookwood": { prices: [200, 250, 330], postalCode: "2141" },
  "Rooty Hill": { prices: [75, 90, 105], postalCode: "2766" },
  "Ropes Crossing": { prices: [75, 90, 105], postalCode: "2760" },
  "Rose Bay": { prices: [330, 430, 575], postalCode: "2029" },
  "Rosebery": { prices: [300, 390, 530], postalCode: "2018" },
  "Rosehill": { prices: [130, 160, 200], postalCode: "2142" },
  "Roselands": { prices: [280, 365, 480], postalCode: "2196" },
  "Rosemeadow": { prices: [290, 380, 500], postalCode: "2560" },
  "Roseville": { prices: [240, 300, 400], postalCode: "2069" },
  "Roseville Chase": { prices: [260, 325, 435], postalCode: "2069" },
  "Rossmore": { prices: [190, 240, 315], postalCode: "2557" },
  "Rouse Hill": { prices: [50, 60, 70], postalCode: "2155" },
  "Rozelle": { prices: [290, 380, 500], postalCode: "2039" },
  "Ruse": { prices: [270, 345, 455], postalCode: "2560" },
  "Rushcutters Bay": { prices: [300, 390, 530], postalCode: "2011" },
  "Russell Lea": { prices: [270, 345, 455], postalCode: "2046" },
  "Rydalmere": { prices: [130, 160, 200], postalCode: "2116" },
  "Ryde": { prices: [170, 215, 280], postalCode: "2112" },
  "Ryde-East": { prices: [185, 235, 305], postalCode: "2112" },
  "Sackville": { prices: [110, 130, 165], postalCode: "2756" },
  "Sackville North": { prices: [150, 180, 230], postalCode: "2756" },
  "Sadleir": { prices: [180, 230, 300], postalCode: "2168" },
  "Sandringham": { prices: [330, 430, 575], postalCode: "2219" },
  "Sandy Point": { prices: [260, 325, 435], postalCode: "2172" },
  "Sans Souci": { prices: [330, 430, 575], postalCode: "2219" },
  "Scheyville": { prices: [70, 85, 100], postalCode: "2756" },
  "Schofields": { prices: [60, 70, 80], postalCode: "2762" },
  "Seaforth": { prices: [330, 430, 575], postalCode: "2092" },
  "Sefton": { prices: [200, 250, 330], postalCode: "2162" },
  "Seven Hills": { prices: [80, 95, 110], postalCode: "2147" },
  "Shalvey": { prices: [75, 90, 105], postalCode: "2770" },
  "Shanes Park": { prices: [70, 85, 100], postalCode: "2747" },
  "Silverdale": { prices: [200, 250, 330], postalCode: "2752" },
  "Silverwater": { prices: [150, 180, 230], postalCode: "2128" },
  "Singletons Mill": { prices: [400, 520, 680], postalCode: "2775" },
  "Smeaton Grange": { prices: [250, 315, 420], postalCode: "2567" },
  "Smithfield": { prices: [120, 145, 180], postalCode: "2164" },
  "South Coogee": { prices: [320, 415, 560], postalCode: "2034" },
  "South Granville": { prices: [150, 180, 230], postalCode: "2142" },
  "South Hurstville": { prices: [330, 430, 575], postalCode: "2221" },
  "South Maroota": { prices: [135, 165, 205], postalCode: "2756" },
  "South Penrith": { prices: [80, 95, 110], postalCode: "2750" },
  "South Turramurra": { prices: [180, 230, 300], postalCode: "2074" },
  "South Wentworthville": { prices: [110, 130, 165], postalCode: "2145" },
  "South Windsor": { prices: [50, 60, 70], postalCode: "2756" },
  "Spencer": { prices: [520, 700, 920], postalCode: "2775" },
  "Spring Farm": { prices: [280, 365, 480], postalCode: "2570" },
  "Springwood": { prices: [170, 215, 280], postalCode: "2777" },
  "St Albans": { prices: [570, 765, 1020], postalCode: "2775" },
  "St Andrews": { prices: [250, 315, 420], postalCode: "2566" },
  "St Clair": { prices: [95, 115, 130], postalCode: "2759" },
  "St Helens Park": { prices: [300, 390, 530], postalCode: "2560" },
  "St Ives": { prices: [185, 235, 305], postalCode: "2075" },
  "St Ives Chase": { prices: [200, 250, 330], postalCode: "2075" },
  "St Johns Park": { prices: [160, 200, 260], postalCode: "2176" },
  "St Leonards": { prices: [260, 325, 435], postalCode: "2065" },
  "St Marys": { prices: [75, 90, 105], postalCode: "2760" },
  "St Peters": { prices: [300, 390, 530], postalCode: "2044" },
  "Stanhope Gardens": { prices: [60, 70, 80], postalCode: "2768" },
  "Stanmore": { prices: [300, 390, 530], postalCode: "2048" },
  "Strathfield": { prices: [210, 265, 355], postalCode: "2135" },
  "Strathfield South": { prices: [220, 280, 370], postalCode: "2136" },
  "Summer Hill": { prices: [270, 345, 455], postalCode: "2130" },
  "Sun Valley": { prices: [180, 230, 300], postalCode: "2777" },
  "Surry Hills": { prices: [300, 390, 530], postalCode: "2010" },
  "Sutherland": { prices: [400, 520, 680], postalCode: "2232" },
  "Sydenham": { prices: [300, 390, 530], postalCode: "2044" },
  "Sydney": { prices: [300, 390, 530], postalCode: "2000" },
  "Sydney Olympic Park": { prices: [170, 215, 280], postalCode: "2127" },
  "Sylvania": { prices: [380, 495, 645], postalCode: "2224" },
  "Sylvania Waters": { prices: [380, 495, 645], postalCode: "2224" },
  "Tahmoor": { prices: [550, 735, 980], postalCode: "2573" },
  "Tallawong": { prices: [55, 65, 75], postalCode: "2762" },
  "Tamarama": { prices: [320, 415, 560], postalCode: "2026" },
  "Taren Point": { prices: [390, 510, 660], postalCode: "2229" },
  "Telopea": { prices: [130, 160, 200], postalCode: "2117" },
  "Tempe": { prices: [300, 390, 530], postalCode: "2044" },
  "Tennyson": { prices: [75, 90, 105], postalCode: "2754" },
  "Tennyson Point": { prices: [210, 265, 355], postalCode: "2112" },
  "Terrey Hills": { prices: [230, 290, 380], postalCode: "2084" },
  "The Gables": { prices: [60, 70, 80], postalCode: "2765" },
  "The Oaks": { prices: [350, 455, 600], postalCode: "2570" },
  "The Ponds": { prices: [55, 65, 75], postalCode: "2769" },
  "The Rocks": { prices: [300, 390, 530], postalCode: "2000" },
  "The Slopes": { prices: [75, 90, 105], postalCode: "2754" },
  "Theresa Park": { prices: [320, 415, 560], postalCode: "2570" },
  "Thirlmere": { prices: [540, 720, 960], postalCode: "2572" },
  "Thornleigh": { prices: [110, 130, 165], postalCode: "2120" },
  "Toongabbie": { prices: [90, 110, 125], postalCode: "2146" },
  "Tregear": { prices: [75, 90, 105], postalCode: "2770" },
  "Turramurra": { prices: [165, 210, 270], postalCode: "2074" },
  "Turramurra-North": { prices: [180, 230, 300], postalCode: "2074" },
  "Turrella": { prices: [300, 390, 530], postalCode: "2205" },
  "Twin Creeks": { prices: [150, 180, 230], postalCode: "2747" },
  "Ultimo": { prices: [300, 390, 530], postalCode: "2007" },
  "Upper Colo": { prices: [330, 430, 575], postalCode: "2756" },
  "Upper Macdonald": { prices: [650, 900, 1180], postalCode: "2775" },
  "Valley Heights": { prices: [180, 230, 300], postalCode: "2777" },
  "Varroville": { prices: [240, 300, 400], postalCode: "2566" },
  "Vaucluse": { prices: [340, 440, 585], postalCode: "2030" },
  "Villawood": { prices: [180, 230, 300], postalCode: "2163" },
  "Vineyard": { prices: [60, 70, 80], postalCode: "2765" },
  "Voyager Point": { prices: [260, 325, 435], postalCode: "2172" },
  "Wahroonga": { prices: [150, 180, 230], postalCode: "2076" },
  "Waitara": { prices: [150, 180, 230], postalCode: "2077" },
  "Wakeley": { prices: [160, 200, 260], postalCode: "2176" },
  "Wallacia": { prices: [170, 215, 280], postalCode: "2745" },
  "Wareemba": { prices: [270, 345, 455], postalCode: "2046" },
  "Warragamba": { prices: [200, 250, 330], postalCode: "2752" },
  "Warrawee": { prices: [150, 180, 230], postalCode: "2074" },
  "Warriewood": { prices: [310, 405, 545], postalCode: "2102" },
  "Warrimoo": { prices: [175, 225, 295], postalCode: "2774" },
  "Warwick Farm": { prices: [190, 240, 315], postalCode: "2170" },
  "Waterfall": { prices: [550, 735, 980], postalCode: "2233" },
  "Waterloo": { prices: [300, 390, 530], postalCode: "2017" },
  "Watsons Bay": { prices: [350, 455, 600], postalCode: "2030" },
  "Wattle Grove": { prices: [240, 300, 400], postalCode: "2173" },
  "Waverley": { prices: [320, 415, 560], postalCode: "2024" },
  "Waverton": { prices: [300, 390, 530], postalCode: "2060" },
  "Webbs Creek": { prices: [400, 520, 680], postalCode: "2775" },
  "Wedderburn": { prices: [350, 455, 600], postalCode: "2560" },
  "Wentworth Falls": { prices: [350, 455, 600], postalCode: "2782" },
  "Wentworth Point": { prices: [180, 230, 300], postalCode: "2127" },
  "Wentworthville": { prices: [110, 130, 165], postalCode: "2145" },
  "Werombi": { prices: [360, 470, 620], postalCode: "2570" },
  "Werrington": { prices: [75, 90, 105], postalCode: "2747" },
  "Werrington County": { prices: [75, 90, 105], postalCode: "2747" },
  "Werrington Downs": { prices: [75, 90, 105], postalCode: "2747" },
  "West Hoxton": { prices: [180, 230, 300], postalCode: "2171" },
  "West Pennant Hills": { prices: [80, 95, 110], postalCode: "2125" },
  "West Pymble": { prices: [190, 240, 315], postalCode: "2073" },
  "West Ryde": { prices: [165, 210, 270], postalCode: "2114" },
  "Westleigh": { prices: [115, 140, 175], postalCode: "2120" },
  "Westmead": { prices: [110, 130, 165], postalCode: "2145" },
  "Wetherill Park": { prices: [120, 145, 180], postalCode: "2164" },
  "Whalan": { prices: [75, 90, 105], postalCode: "2770" },
  "Whale Beach": { prices: [360, 470, 620], postalCode: "2107" },
  "Wheeler Heights": { prices: [320, 415, 560], postalCode: "2097" },
  "Wheeny Creek": { prices: [380, 495, 645], postalCode: "2758" },
  "Wheeny Creek (Colo End)": { prices: [230, 290, 380], postalCode: "2756" },
  "Wilberforce": { prices: [70, 85, 100], postalCode: "2756" },
  "Wiley Park": { prices: [250, 315, 420], postalCode: "2195" },
  "Willmot": { prices: [75, 90, 105], postalCode: "2770" },
  "Willoughby": { prices: [270, 345, 455], postalCode: "2068" },
  "Willoughby East": { prices: [270, 345, 455], postalCode: "2068" },
  "Wilton": { prices: [480, 625, 840], postalCode: "2571" },
  "Windsor": { prices: [50, 60, 70], postalCode: "2756" },
  "Windsor Downs": { prices: [50, 60, 70], postalCode: "2756" },
  "Windsor-South": { prices: [50, 60, 70], postalCode: "2756" },
  "Winmalee": { prices: [160, 200, 260], postalCode: "2777" },
  "Winston Hills": { prices: [85, 100, 115], postalCode: "2153" },
  "Wisemans - Over Ferry": { prices: [400, 520, 680], postalCode: "2775" },
  "Wisemans Ferry Syd Side": { prices: [260, 325, 435], postalCode: "2775" },
  "Wolli Creek": { prices: [300, 390, 530], postalCode: "2205" },
  "Wollstonecraft": { prices: [280, 365, 480], postalCode: "2065" },
  "Woodbine": { prices: [250, 315, 420], postalCode: "2560" },
  "Woodcroft": { prices: [75, 90, 105], postalCode: "2767" },
  "Woodford": { prices: [250, 315, 420], postalCode: "2778" },
  "Woodpark": { prices: [140, 170, 215], postalCode: "2164" },
  "Woollahra": { prices: [310, 405, 545], postalCode: "2025" },
  "Woolloomooloo": { prices: [300, 390, 530], postalCode: "2011" },
  "Woolooware": { prices: [400, 520, 680], postalCode: "2230" },
  "Woolwich": { prices: [260, 325, 435], postalCode: "2110" },
  "Woronora": { prices: [400, 520, 680], postalCode: "2232" },
  "Woronora Heights": { prices: [400, 520, 680], postalCode: "2233" },
  "Wrights Creek": { prices: [550, 735, 980], postalCode: "2756" },
  "Yagoona": { prices: [210, 265, 355], postalCode: "2199" },
  "Yarramundi": { prices: [75, 90, 105], postalCode: "2753" },
  "Yarrawarrah": { prices: [420, 550, 720], postalCode: "2233" },
  "Yellow Rock": { prices: [170, 215, 280], postalCode: "2777" },
  "Yennora": { prices: [165, 210, 270], postalCode: "2161" },
  "Yosemite": { prices: [400, 520, 680], postalCode: "2577" },
  "Yowie Bay": { prices: [420, 550, 720], postalCode: "2228" },
  "Zetland": { prices: [300, 390, 530], postalCode: "2017" },
};

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Load all delivery rates for this shop from DB
  let rates = await prisma.deliveryRate.findMany({
    where: { shop },
    orderBy: { suburb: "asc" },
  });


















// Backfill postalCodes for any rows missing them
const missing = rates.filter(r => !r.postalCode);
if (missing.length > 0) {
  for (const rate of missing) {
    const defaultData = DEFAULT_SUBURBS[rate.suburb];
    if (defaultData?.postalCode) {
      await prisma.deliveryRate.update({
        where: { id: rate.id },
        data: { postalCode: defaultData.postalCode },
      });
    }
  }
  rates = await prisma.deliveryRate.findMany({
    where: { shop },
    orderBy: { suburb: "asc" },
  });
}









  // First-time setup: if DB empty, seed from defaults
  if (rates.length === 0) {
    const seedData = Object.entries(DEFAULT_SUBURBS).map(([suburb, data]) => ({
      shop,
      suburb,
      postalCode: data.postalCode || "",
      weekday:    data.prices[0],
      saturday:   data.prices[1],
      sunday:     data.prices[2],
    }));
    await prisma.deliveryRate.createMany({ data: seedData });
    rates = await prisma.deliveryRate.findMany({
      where: { shop },
      orderBy: { suburb: "asc" },
    });
  }

  return { rates, shop };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Save a single edited suburb
  if (intent === "update") {
    const id         = parseInt(formData.get("id"));
    const postalCode = formData.get("postalCode") || "";
    const weekday    = parseFloat(formData.get("weekday"))  || 0;
    const saturday   = parseFloat(formData.get("saturday")) || 0;
    const sunday     = parseFloat(formData.get("sunday"))   || 0;
    await prisma.deliveryRate.update({
      where: { id },
      data: { postalCode, weekday, saturday, sunday },
    });
    return { success: true, intent: "update" };
  }

  // Add new suburb
  if (intent === "add") {
    const suburb   = formData.get("suburb")?.trim();
    const weekday  = parseFloat(formData.get("weekday"))  || 0;
    const saturday = parseFloat(formData.get("saturday")) || 0;
    const postalCode = formData.get("postalCode") || "";
    const sunday     = parseFloat(formData.get("sunday"))   || 0;
    if (!suburb) return { error: "Suburb name is required.", intent: "add" };
    try {
      await prisma.deliveryRate.create({ data: { shop, suburb, postalCode, weekday, saturday, sunday } });
    } catch {
      return { error: "Suburb already exists.", intent: "add" };
    }
    return { success: true, intent: "add" };
  }

  // Delete a suburb
  if (intent === "delete") {
    const id = parseInt(formData.get("id"));
    await prisma.deliveryRate.delete({ where: { id } });
    return { success: true, intent: "delete" };
  }

  // Export CSV
  if (intent === "export") {
    const rates = await prisma.deliveryRate.findMany({
      where: { shop },
      orderBy: { suburb: "asc" },
    });
    const csv = [
      "Suburb,Weekday,Saturday,Sunday",
      ...rates.map(r => `"${r.suburb}",${r.weekday},${r.saturday},${r.sunday}`),
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="delivery-rates.csv"',
      },
    });
  }

  // Import CSV
  if (intent === "import") {
    const file = formData.get("csvFile");
    const text = await file.text();
    const lines = text.split("\n").slice(1); // skip header
    let imported = 0;
    for (const line of lines) {
      const parts = line.match(/(".*?"|[^,]+)/g);
      if (!parts || parts.length < 4) continue;
      const suburb   = parts[0].replace(/"/g, "").trim();
      const weekday  = parseFloat(parts[1]) || 0;
      const saturday = parseFloat(parts[2]) || 0;
      const sunday   = parseFloat(parts[3]) || 0;
      if (!suburb) continue;
      await prisma.deliveryRate.upsert({
        where:  { shop_suburb: { shop, suburb } },
        update: { weekday, saturday, sunday },
        create: { shop, suburb, weekday, saturday, sunday },
      });
      imported++;
    }
    return { success: true, intent: "import", count: imported };
  }

  return { error: "Unknown action." };
}

export default function DeliveryRates() {
  const { rates } = useLoaderData();

  const [search, setSearch]       = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [newSuburb, setNewSuburb] = useState({ suburb: "", postalCode: "", weekday: "", saturday: "", sunday: "" });
  const [localRates, setLocalRates] = useState(rates);

  useEffect(() => { setLocalRates(rates); }, [rates]);

  const filtered = localRates.filter(r =>
    r.suburb.toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(rate) {
    setEditingId(rate.id);
    setEditValues({ postalCode: rate.postalCode || "", weekday: rate.weekday, saturday: rate.saturday, sunday: rate.sunday });
  }

  function cancelEdit() { setEditingId(null); setEditValues({}); }

  async function saveEdit(rate) {
    setSaving(true);
    const fd = new FormData();
    fd.append("intent",   "update");
    fd.append("id",       rate.id);
    fd.append("weekday", editValues.weekday);
    fd.append("postalCode", editValues.postalCode || "");
    fd.append("saturday", editValues.saturday);
    fd.append("sunday",   editValues.sunday);
    const resp = await fetch(window.location.pathname, { method: "POST", body: fd });
    if (resp.ok) {
      setLocalRates(prev => prev.map(r =>
        r.id === rate.id
          ? { ...r, postalCode: editValues.postalCode || "", weekday: parseFloat(editValues.weekday), saturday: parseFloat(editValues.saturday), sunday: parseFloat(editValues.sunday) }
          : r
      ));
      setMessage({ type: "success", text: `${rate.suburb} updated successfully.` });
      setEditingId(null);
    } else {
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }

  async function deleteRate(rate) {
    if (!window.confirm(`Delete "${rate.suburb}" from delivery rates?`)) return;
    const fd = new FormData();
    fd.append("intent", "delete");
    fd.append("id", rate.id);
    await fetch(window.location.pathname, { method: "POST", body: fd });
    setLocalRates(prev => prev.filter(r => r.id !== rate.id));
    setMessage({ type: "success", text: `${rate.suburb} deleted.` });
    setTimeout(() => setMessage(null), 3000);
  }

  async function addSuburb() {
    if (!newSuburb.suburb.trim()) { setMessage({ type: "error", text: "Suburb name is required." }); return; }
    const fd = new FormData();
    fd.append("intent",   "add");
    fd.append("suburb", newSuburb.suburb);
    fd.append("postalCode", newSuburb.postalCode || "");
    fd.append("weekday",  newSuburb.weekday  || 0);
    fd.append("saturday", newSuburb.saturday || 0);
    fd.append("sunday",   newSuburb.sunday   || 0);
    const resp = await fetch(window.location.pathname, { method: "POST", body: fd });
    const data = await resp.json().catch(() => ({}));
    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `${newSuburb.suburb} added successfully.` });
      setShowAdd(false);
      setNewSuburb({ suburb: "", postalCode: "", weekday: "", saturday: "", sunday: "" });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  function exportCSV() {
    const rows = [
      "Suburb,Weekday,Saturday,Sunday",
      ...localRates.map(r => `"${r.suburb}",${r.weekday},${r.saturday},${r.sunday}`),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "delivery-rates.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function importCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("intent",  "import");
    fd.append("csvFile", file);
    await fetch(window.location.pathname, { method: "POST", body: fd });
    setMessage({ type: "success", text: "CSV imported. Refreshing..." });
    setTimeout(() => window.location.reload(), 1000);
  }

  const inputStyle = { padding: "6px 8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px", width: "80px" };
  const btnStyle   = (bg, color) => ({ padding: "5px 12px", background: bg, color, border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" });

  return (
    <s-page heading="Delivery Rates Manager">

      {message && (
        <s-banner tone={message.type === "success" ? "success" : "critical"}>
          {message.text}
        </s-banner>
      )}

      <s-section heading="Manage Suburb Delivery Fees">
        <s-paragraph>
          Edit weekday, Saturday, and Sunday delivery fees for each suburb.
          Changes reflect immediately on the Delivery Fee Estimator on your website.
          Total suburbs: {localRates.length}
        </s-paragraph>

        {/* Search + Toolbar */}
        <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search suburb..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", flex: "1", minWidth: "200px" }}
          />
          <button onClick={() => setShowAdd(!showAdd)} style={btnStyle("#1a2e4a", "#f5c518")}>
            + Add Suburb
          </button>
          <button onClick={exportCSV} style={btnStyle("#28a745", "white")}>
            Export CSV
          </button>
          <label style={{ ...btnStyle("#6c757d", "white"), display: "inline-block", cursor: "pointer" }}>
            Import CSV
            <input type="file" accept=".csv" onChange={importCSV} style={{ display: "none" }} />
          </label>
        </div>

        {/* Add New Suburb Form */}
        {showAdd && (
          <div style={{ marginTop: "16px", padding: "16px", background: "#f0fff4", border: "1px solid #c3e6cb", borderRadius: "6px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Suburb Name</div>
              <input type="text" placeholder="e.g. Kellyville" value={newSuburb.suburb}
                onChange={e => setNewSuburb(p => ({ ...p, suburb: e.target.value }))}
                style={{ ...inputStyle, width: "160px" }} />
            </div>


              <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Postcode</div>
              <input type="text" placeholder="XXXX" value={newSuburb.postalCode || ""}
                onChange={e => setNewSuburb(p => ({ ...p, postalCode: e.target.value }))}
                style={{ ...inputStyle, width: "80px", textAlign: "center" }}
                maxLength={4}
              />
            </div>





            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Weekday ($)</div>
              <input type="number" placeholder="0" value={newSuburb.weekday}
                onChange={e => setNewSuburb(p => ({ ...p, weekday: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Saturday ($)</div>
              <input type="number" placeholder="0" value={newSuburb.saturday}
                onChange={e => setNewSuburb(p => ({ ...p, saturday: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Sunday ($)</div>
              <input type="number" placeholder="0" value={newSuburb.sunday}
                onChange={e => setNewSuburb(p => ({ ...p, sunday: e.target.value }))}
                style={inputStyle} />
            </div>
            <button onClick={addSuburb} style={btnStyle("#1a2e4a", "#f5c518")}>Add</button>
            <button onClick={() => setShowAdd(false)} style={btnStyle("#dc3545", "white")}>Cancel</button>
          </div>
        )}

        {/* Rates Table */}
        <div style={{ marginTop: "16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#1a2e4a", color: "#f5c518" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Suburb</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Postcode</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Weekday ($)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Saturday ($)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Sunday ($)</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#888" }}>No suburbs found.</td></tr>
              )}
              {filtered.map((rate, i) => (
                <tr key={rate.id} style={{ background: i % 2 === 0 ? "white" : "#f8f9fa", borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 12px", fontWeight: "500" }}>{rate.suburb}</td>

                  

                




                  {editingId === rate.id ? (
                    <>
                      <td style={{ padding: "6px 12px", textAlign: "center" }}>
                        <input type="text" value={editValues.postalCode || ""}
                          onChange={e => setEditValues(p => ({ ...p, postalCode: e.target.value }))}
                          style={{ ...inputStyle, width: "70px", textAlign: "center" }}
                          placeholder="XXXX"
                          maxLength={4}
                        />
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right" }}>
                        <input type="number" value={editValues.weekday}
                          onChange={e => setEditValues(p => ({ ...p, weekday: e.target.value }))}
                          style={inputStyle} />
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right" }}>
                        <input type="number" value={editValues.saturday}
                          onChange={e => setEditValues(p => ({ ...p, saturday: e.target.value }))}
                          style={inputStyle} />
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right" }}>
                        <input type="number" value={editValues.sunday}
                          onChange={e => setEditValues(p => ({ ...p, sunday: e.target.value }))}
                          style={inputStyle} />
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button onClick={() => saveEdit(rate)} disabled={saving} style={btnStyle("#28a745", "white")}>Save</button>
                          <button onClick={cancelEdit} style={btnStyle("#6c757d", "white")}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                      
                       
                      
                      <>
                        

                          
                        <td style={{ padding: "8px 12px", textAlign: "center", color: "#555", fontSize: "13px" }}>
                        {rate.postalCode || "—"}
                      </td>




                      <td style={{ padding: "8px 12px", textAlign: "right" }}>${rate.weekday.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>${rate.saturday.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>${rate.sunday.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button onClick={() => startEdit(rate)} style={btnStyle("#1a2e4a", "#f5c518")}>Edit</button>
                          <button onClick={() => deleteRate(rate)} style={btnStyle("#dc3545", "white")}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);