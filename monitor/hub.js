/* ============================================================
   Monitor's front page: one tile per page.

   Each page lives on its own site (/nine-to-five/, /budget-galaxy/...) and
   updates itself. A tile reads a small file that its page publishes, each
   time this page is opened, so the numbers here are always that page's
   latest. If the file can't be read, the tile keeps the text in the HTML and
   still links to the page.

   Needs d3 loaded first. Text from the data goes in with textContent.
   ============================================================ */

const BLUE = "#2148cc", GREY_DOT = "#d6d1c9";
const NS = "http://www.w3.org/2000/svg";

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const svgEl = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
};
const getJSON = async (url) => {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// a small line of the last few years, ending in a dot
function sparkline(values, w = 120, h = 40) {
  const svg = svgEl("svg", { width: w, height: h, "aria-hidden": "true" });
  const x = d3.scaleLinear([0, values.length - 1], [2, w - 4]);
  const y = d3.scaleLinear(d3.extent(values), [h - 3, 3]);
  svg.append(
    svgEl("path", { d: d3.line((v, i) => x(i), (v) => y(v))(values), fill: "none", stroke: BLUE, "stroke-width": 1.5, "stroke-linejoin": "round" }),
    svgEl("circle", { cx: x(values.length - 1), cy: y(values.at(-1)), r: 2.75, fill: BLUE }),
  );
  return svg;
}

// A topic page's tile (data-tile = its tile.json): its question, headline number, change, small line and release.
async function topicTile(tile) {
  try {
    const t = await getJSON(tile.dataset.tile);
    tile.querySelector("h2").textContent = t.question;
    const left = el("div");
    left.append(el("div", "v", t.value), el("div", "l", `${t.label} · ${t.change}`));
    tile.querySelector(".stat").replaceChildren(left, sparkline(t.spark));
    tile.querySelector(".when").textContent = `${t.updated.survey}, ${t.updated.month} · released ${t.updated.released}`;
  } catch (e) {
    console.warn("Tile:", e);
  }
}

// The Budget Galaxy tile (data-galaxy = its galaxy.json): the latest budget's largest theme and its share of the new
// spending (measures that cost money, as Budget Galaxy counts them), and a small copy of its map with the latest
// budget's measures in blue.
async function galaxyTile(tile) {
  try {
    const data = await getJSON(tile.dataset.galaxy);
    const year = d3.max(data.years);
    const spending = d3.rollup(data.measures.filter((m) => m.year === year && m.money > 0), (v) => d3.sum(v, (m) => m.money), (m) => m.cat);
    const [top, money] = d3.greatest(spending, ([, v]) => v);
    const theme = data.categories.find((c) => c.id === top).name;
    const left = el("div");
    left.append(el("div", "v", d3.format(".0%")(money / d3.sum(spending.values()))),
                el("div", "l", `of Budget ${year}'s new spending goes to ${theme.toLowerCase()}`));
    tile.querySelector(".stat").replaceChildren(left, miniMap(data.measures, year));
    tile.querySelector(".when").textContent =
      `Budget Galaxy · ${d3.format(",")(data.measures.length)} measures in Budgets ${d3.min(data.years)} to ${year}`;
  } catch (e) {
    console.warn("Budget Galaxy tile:", e);
  }
}

// Budget Galaxy's map, small: every measure a dot (its map is 1.5 times as wide as it is tall), earlier budgets in grey
function miniMap(measures, year, w = 114, h = 76) {
  // (a viewBox, so the stylesheet can draw it smaller in narrow tiles)
  const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: "map", "aria-hidden": "true" });
  const x = d3.scaleLinear([0, 1], [2, w - 2]), y = d3.scaleLinear([0, 1], [h - 2, 2]);
  const dot = (m, r, fill) => svgEl("circle", { cx: x(m.x).toFixed(1), cy: y(m.y).toFixed(1), r, fill });
  svg.append(...measures.filter((m) => m.year !== year).map((m) => dot(m, 1, GREY_DOT)),
             ...measures.filter((m) => m.year === year).map((m) => dot(m, 1.35, BLUE)));
  return svg;
}

document.querySelectorAll("[data-tile]").forEach(topicTile);
document.querySelectorAll("[data-galaxy]").forEach(galaxyTile);
