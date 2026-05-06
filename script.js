const fields = {
  name: document.querySelector("#name"),
  role: document.querySelector("#role"),
  location: document.querySelector("#location"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
  links: document.querySelector("#links"),
  summary: document.querySelector("#summary"),
  experienceTitle: document.querySelector("#experienceTitle"),
  experienceDates: document.querySelector("#experienceDates"),
  experience: document.querySelector("#experience"),
  skills: document.querySelector("#skills"),
};

const output = {
  name: document.querySelector("#outName"),
  role: document.querySelector("#outRole"),
  contact: document.querySelector("#outContact"),
  summary: document.querySelector("#outSummary"),
  experienceTitle: document.querySelector("#outExperienceTitle"),
  experienceDates: document.querySelector("#outExperienceDates"),
  experience: document.querySelector("#outExperience"),
  skills: document.querySelector("#outSkills"),
  score: document.querySelector("#score"),
  resume: document.querySelector("#resume"),
  templateLabel: document.querySelector("#previewTemplateLabel"),
};

const templateLabels = {
  modern: "Modern CV",
  classic: "Classic CV",
  compact: "Compact CV",
};

const strongVerbs = ["Delivered", "Built", "Analyzed", "Automated", "Improved", "Designed", "Consolidated"];

function cleanList(value) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function enhanceSummary(summary, role) {
  const base = summary.trim();
  if (!base) {
    return `Results-driven ${role || "professional"} with a track record of turning complex business needs into clear, measurable outcomes.`;
  }

  const lower = base.toLowerCase();
  const strengths = [];
  if (lower.includes("sql")) strengths.push("SQL-driven analysis");
  if (lower.includes("power bi") || lower.includes("dashboard")) strengths.push("dashboard storytelling");
  if (lower.includes("python")) strengths.push("Python-based automation");
  if (lower.includes("excel")) strengths.push("advanced Excel reporting");

  const focus = strengths.length ? strengths.join(", ") : "business problem solving";
  return `${role || "Analytical professional"} specializing in ${focus}. Skilled at transforming messy information into executive-ready insights, repeatable reporting workflows, and practical recommendations that help teams make faster decisions.`;
}

function enhanceBullet(text, index) {
  const trimmed = text.replace(/^[-*]\s*/, "").trim();
  if (!trimmed) return "";

  const startsWithVerb = strongVerbs.some((verb) => trimmed.toLowerCase().startsWith(verb.toLowerCase()));
  const verb = startsWithVerb ? "" : `${strongVerbs[index % strongVerbs.length]} `;
  const metric = /\d|%|hours|days|weeks|speed|faster|reduced|increased/i.test(trimmed)
    ? ""
    : " to improve reporting quality and team efficiency";

  return `${verb}${trimmed}${metric}.`.replace(/\.+$/, ".");
}

function calculateScore() {
  let score = 45;
  score += fields.summary.value.length > 120 ? 12 : 4;
  score += cleanList(fields.experience.value).length >= 3 ? 14 : 6;
  score += cleanList(fields.skills.value).length >= 6 ? 11 : 5;
  score += fields.email.value && fields.phone.value ? 8 : 0;
  score += /\d|%|reduced|increased|improved|automated/i.test(fields.experience.value) ? 10 : 0;
  return Math.min(score, 98);
}

function render() {
  const role = fields.role.value.trim();
  output.name.textContent = fields.name.value.trim() || "Your Name";
  output.role.textContent = role || "Target Role";
  output.summary.textContent = fields.summary.value.trim();
  output.experienceTitle.textContent = fields.experienceTitle.value.trim() || "Role, Company";
  output.experienceDates.textContent = fields.experienceDates.value.trim();

  output.contact.innerHTML = "";
  [fields.location.value, fields.email.value, fields.phone.value, fields.links.value].forEach((item) => {
    if (!item.trim()) return;
    const li = document.createElement("li");
    li.textContent = item.trim();
    output.contact.appendChild(li);
  });

  output.experience.innerHTML = "";
  cleanList(fields.experience.value).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.replace(/^[-*]\s*/, "");
    output.experience.appendChild(li);
  });

  output.skills.innerHTML = "";
  cleanList(fields.skills.value).forEach((skill) => {
    const span = document.createElement("span");
    span.textContent = skill;
    output.skills.appendChild(span);
  });

  output.score.textContent = calculateScore();
}

function enhanceResume() {
  fields.summary.value = enhanceSummary(fields.summary.value, fields.role.value.trim());
  fields.experience.value = cleanList(fields.experience.value).map(enhanceBullet).join("\n");
  render();
}

function setTemplate(template) {
  output.resume.className = `resume ${template}`;
  output.templateLabel.textContent = templateLabels[template];
  document.querySelectorAll(".template-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.template === template);
  });
}

Object.values(fields).forEach((field) => field.addEventListener("input", render));

document.querySelector("#enhanceBtn").addEventListener("click", enhanceResume);
document.querySelector("#printBtn").addEventListener("click", () => window.print());

document.querySelectorAll(".template-option").forEach((button) => {
  button.addEventListener("click", () => setTemplate(button.dataset.template));
});

render();
