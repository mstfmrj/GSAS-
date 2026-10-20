const fs = require("fs");
const path = require("path");

const [opCsvPath, iprintCsvPath, medalmadeCsvPath] = process.argv.slice(2);
const projectRoot = path.resolve(__dirname, "..");

if (!opCsvPath || !iprintCsvPath || !medalmadeCsvPath) {
  console.error(
    "Usage: node scripts/generate-seeds.js <operations.csv> <iprint.csv> <medalmade.csv>"
  );
  process.exit(1);
}

function readCsv(filePath, label) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  try {
    return fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${label} CSV at "${resolvedPath}"`, { cause: error });
  }
}

function writeSeed(fileName, data) {
  const outputPath = path.join(projectRoot, "src", "lib", "seeds", fileName);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
}

function parseCSV(text) {
  const lines = text.split("\n");
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const row = [];
    let inQuotes = false;
    let current = "";
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  return result;
}


const opCsv = readCsv(opCsvPath, "Operations projects");
const opRows = parseCSV(opCsv);

const opProjects = [];
for (let i = 2; i < opRows.length; i++) {
  const r = opRows[i];
  if (!r[0] || isNaN(parseInt(r[0], 10))) continue;
  const sn = parseInt(r[0], 10);
  const projectId = r[3] || "";
  const id = `op_${sn}_${projectId.replace(/\s+/g, "_")}`;

  opProjects.push({
    id,
    category: "OP",
    sn,
    advisory_date: r[1] || "",
    advisory_year: r[2] || "",
    project_id: projectId,
    project_name_en: r[4] || "",
    project_name_ar: r[5] || "",
    name_in_gsasgate: r[6] || "",
    country: r[7] || "QATAR",
    owner: r[8] || "",
    consultant: r[9] || "",
    consultant_email: r[10] || "",
    contractor: r[11] || "",
    scheme: r[12] || "",
    status: r[13] || "",
    issued_status: r[14] || "",
    gso_plate: r[15] || "",
    payment_status: r[16] || "",
    rating: r[17] || "",
    cert_collection_date: r[18] || "",
    indoor_plaque_date: r[19] || "",
    outdoor_plaque_date: r[20] || "",
    issuance_month_year: r[21] || "",
    link_to_files: r[22] || "",
    loc: r[23] || "",
    plaque_app_form: r[24] || "",
    cert_photo: r[25] || "",
    building_photo: r[26] || "",
    plaque_displayed: r[27] || "",
    plaque_validity: r[28] || ""
  });
}

console.log("Parsed OP projects:", opProjects.length);
writeSeed("op_projects.json", opProjects);


const iprintCsv = readCsv(iprintCsvPath, "iPrint inventory");
const iprintLines = iprintCsv.split("\n");
let currentSeries = "Series 1 (2025 - 100 pcs)";
const iprintItems = [];
let itemIdx = 1;

for (let i = 0; i < iprintLines.length; i++) {
  const line = iprintLines[i].trim();
  if (!line) continue;
  if (line.includes("Quatity Ordered") || line.includes("1A")) {
    currentSeries = "Series 2 (2025/2026 - 100 pcs)";
  }
  if (line.includes("200 pcs 2026")) {
    currentSeries = "Series 3 (2026 - 200 pcs)";
  }

  const parts = [];
  let inQuotes = false;
  let cur = "";
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { parts.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  parts.push(cur.trim());

  const sn = parseInt(parts[0], 10);
  if (!isNaN(sn) && parts[1] && (parts[1].includes("-25") || parts[1].includes("-26"))) {
    const seriesCode = currentSeries.includes("Series 1") ? "S1" : currentSeries.includes("Series 2") ? "S2" : "S3";
    iprintItems.push({
      id: `iprint_${seriesCode}_${sn}_${itemIdx++}`,
      series: currentSeries,
      sn: sn,
      date: parts[1] || "",
      project_name: parts[2] ? parts[2].replace(/^"|"$/g, "").trim() : "",
      count: parseInt(parts[3], 10) || null,
      batch: parts[4] || "",
      remarks: parts[5] ? parts[5].replace(/^"|"$/g, "").trim() : "",
      type: parts[6] || "GSAS",
      count_order: parts[7] ? parseInt(parts[7], 10) || null : null,
      status: currentSeries.includes("Series 1") ? "Completed" : currentSeries.includes("Series 2") ? "Completed" : "Issued"
    });
  }
}

console.log("Parsed Iprint items:", iprintItems.length);
writeSeed("iprint_inventory.json", iprintItems);


const medalmadeCsv = readCsv(medalmadeCsvPath, "MedalMade inventory");
const medalmadeRows = parseCSV(medalmadeCsv);







const plaqueTypes = [
  { name: "PLAQUE Certified (CERTIFIED)", category: "CERTIFIED" },
  { name: "PLAQUE D&B (*) 1 Star", category: "D&B" },
  { name: "PLAQUE D&B (**) 2 Stars", category: "D&B" },
  { name: "PLAQUE D&B (***) 3 Stars", category: "D&B" },
  { name: "PLAQUE D&B (****) 4 Stars", category: "D&B" },
  { name: "PLAQUE D&B (*****) 5 Stars", category: "D&B" },
  { name: "PLAQUE D&B (******) 6 Stars", category: "D&B" },
  { name: "PLAQUE CM (Class A+)", category: "CM" },
  { name: "PLAQUE CM ( Class A)", category: "CM" },
  { name: "PLAQUE CM (Class B)", category: "CM" },
  { name: "PLAQUE CM (Class C)", category: "CM" },
  { name: "PLAQUE CM (Class D)", category: "CM" },
  { name: "PLAQUE Operations Bronze", category: "OP" },
  { name: "PLAQUE Operations Silver", category: "OP" },
  { name: "PLAQUE Operations Gold", category: "OP" },
  { name: "PLAQUE Operations Platinum", category: "OP" },
  { name: "PLAQUE Operations Diamond", category: "OP" }
];


const medalmadeItems = plaqueTypes.map((pt, idx) => {

  const totRow = medalmadeRows.find(r => r[0] && r[0].trim() === pt.name) || [];

  const delRow = medalmadeRows.slice(25).find(r => r[0] && r[0].trim() === pt.name) || [];

  const out25Row = medalmadeRows.slice(55).find(r => r[0] && r[0].trim() === pt.name) || [];

  const out26Row = medalmadeRows.slice(85).find(r => r[0] && r[0].trim() === pt.name) || [];

  const stockOnHand = parseInt(totRow[1], 10) || 0;
  const firstOrder = parseInt(totRow[2], 10) || 0;
  const secondOrder = parseInt(totRow[3], 10) || 0;
  const totalMedalmadeOrder = parseInt(totRow[4], 10) || 0;
  const totalPlaques = parseInt(totRow[5], 10) || 0;

  const totalDelivered = parseInt(delRow[12], 10) || 0;
  const remainingMedalmade = parseInt(delRow[13], 10) || 0;
  const inhousePlaque = parseInt(delRow[14], 10) || 0;
  const remainingInhouse = parseInt(delRow[15], 10) || 0;
  const remainingStockTotal = parseInt(delRow[16], 10) || 0;

  const outgoing2025Total = parseInt(out25Row[1], 10) || 0;
  const outgoing2026Total = parseInt(out26Row[1], 10) || 0;
  const nextOrder = parseInt(out26Row[17], 10) || 0;

  return {
    id: `mm_${idx + 1}_${pt.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    plaque_type: pt.name,
    category: pt.category,
    stock_on_hand: stockOnHand,
    first_order: firstOrder,
    second_order: secondOrder,
    total_medalmade_order: totalMedalmadeOrder,
    total_plaques: totalPlaques,
    total_delivered: totalDelivered,
    remaining_medalmade: remainingMedalmade,
    inhouse_plaque: inhousePlaque,
    remaining_inhouse: remainingInhouse,
    remaining_stock_total: remainingStockTotal,
    outgoing_2025_total: outgoing2025Total,
    outgoing_2026_total: outgoing2026Total,
    next_order: nextOrder,
    status: remainingStockTotal > 5 ? "Completed" : remainingStockTotal > 0 ? "Pending" : "Issued"
  };
});

console.log("Parsed Medalmade items:", medalmadeItems.length);
writeSeed("medalmade_inventory.json", medalmadeItems);

console.log("All seeds successfully created!");
