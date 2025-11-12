import{b as u,g as h,d as m,e as g}from"./biomeWildlife-Cf3ZDbJA.js";const d=document.getElementById("biomeSelector"),a=document.getElementById("biomeDisplay"),l=document.getElementById("biomeDescription"),c=document.getElementById("biomeImage");if(!d||!a||!l||!c)throw new Error("Biome explorer markup is missing expected elements.");const n=d,r=a,i=l,s=c;u.forEach(t=>{const o=document.createElement("option");o.value=t.id,o.textContent=t.name,n.appendChild(o)});function b(t=[]){return!Array.isArray(t)||t.length===0?"None":t.join(", ")}function p(t=[]){return t.length?`
    <table class="biome-table">
      <thead>
        <tr>
          <th>Animal</th>
          <th>Difficulty</th>
          <th>Aggressive</th>
          <th>Diet</th>
          <th>Recommended Tools</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${t.map(e=>`
        <tr>
          <td>${e.name}</td>
          <td>${e.difficulty}</td>
          <td>${e.aggressive?"Yes":"No"}</td>
          <td>${e.diet}</td>
          <td>${b(e.tools)}</td>
          <td>${e.notes||""}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `:"<p>No notable huntable animals recorded.</p>"}function f(t=[]){return t.length?`
    <table class="biome-table">
      <thead>
        <tr>
          <th>Plant / Fungus</th>
          <th>Edible Parts</th>
          <th>Poisonous or Caution</th>
          <th>Useful Parts & Applications</th>
        </tr>
      </thead>
      <tbody>${t.map(e=>`
        <tr>
          <td>${e.name}</td>
          <td>${e.edibleParts||"None"}</td>
          <td>${e.poisonousParts||"None"}</td>
          <td>${e.usefulParts||"None"}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `:"<p>No gatherable flora recorded.</p>"}n.addEventListener("change",()=>{const t=h(n.value);if(!t){r.textContent="",i.textContent="",s.src="";return}const o=m(n.value),e=g(n.value);r.innerHTML=`
    <h2>${t.name}</h2>
    <p><strong>Features:</strong> ${t.features.join(", ")}</p>
    <p><strong>Points of Interest:</strong> ${o.join(", ")}</p>
    <p><strong>Wood Modifier:</strong> ${t.woodMod}</p>
    <section>
      <h3>Huntable Wildlife</h3>
      ${p(e.animals)}
    </section>
    <section>
      <h3>Harvestable Flora</h3>
      ${f(e.plants)}
    </section>
  `,i.textContent=t.description,s.src=new URL(Object.assign({})[`./images/${t.id}.jpg`],import.meta.url).href,s.alt=t.name});
