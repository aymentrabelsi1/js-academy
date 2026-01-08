<<<<<<< HEAD
const {useEffect, useMemo, useRef, useState} = React;

/* localStorage keys */
const LS = {
  DONE: "jsacademy_done_v2",
  CODE: "jsacademy_code_v2",
  LAST: "jsacademy_last_v2"
};

function readLS(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}
function writeLS(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/* Lesson helpers (NO quizzes, NO challenges) */
function lesson(id, title, topic, starterCode, explanation, defaultLang = "js"){
  return { id, title, topic, starterCode, explanation, defaultLang };
}
function explain(lines){ return lines.map(t => ({ text: t })); }

/* Sandbox builder: captures console + errors to parent */
function buildSandboxHTML({ mode, code }) {
  const consolePatch = `
    (function(){
      function send(type, payload){
        parent.postMessage({ __JSACADEMY__: true, type, payload }, "*");
      }
      const orig = {};
      ["log","info","warn","error"].forEach((k) => {
        orig[k] = console[k];
        console[k] = function(...args){
          try{
            send("console", {
              level: k,
              args: args.map((a) => {
                try{
                  if(typeof a === "string") return a;
                  return JSON.stringify(a, null, 2);
                }catch{
                  return String(a);
                }
              })
            });
          }catch(_e){}
          orig[k].apply(console, args);
        };
      });

      window.addEventListener("error", (e) => {
        send("error", { message: e.message });
      });

      window.addEventListener("unhandledrejection", (e) => {
        send("error", { message: (e.reason && e.reason.message) ? e.reason.message : String(e.reason) });
      });

      send("ready", { ok:true });
    })();
  `;

  if (mode === "html") {
    // allow full HTML examples
    return `
${code}
<script>${consolePatch}<\/script>
`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body{font-family:system-ui;padding:14px}
    .hint{opacity:.7;font-size:13px}
    code{background:#f6f6f7;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="hint">Sandbox running JavaScript…</div>
  <script>${consolePatch}<\/script>
  <script>
    try {
${code}
    } catch(e) {
      console.error("Runtime error:", e && e.message ? e.message : e);
    }
  <\/script>
</body>
</html>`;
}

/* A few HTML+JS lessons need full HTML starter code */
function htmlLessonTemplate(title, bodyInner, scriptInner){
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui;padding:16px}
    .card{max-width:820px;margin:0 auto;border:1px solid #ddd;border-radius:16px;padding:16px}
    button,input,textarea,select{padding:10px 12px;border-radius:12px;border:1px solid #ddd;background:#fff}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .muted{opacity:.7}
    .box{border:1px solid #ddd;border-radius:14px;padding:12px;margin-top:10px}
    .danger{border-color:#ff4d6d}
    code{background:#f6f6f7;padding:2px 6px;border-radius:8px}
    a{color:inherit}
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    ${bodyInner}
    <p class="muted">Tip: You can still see logs in the platform console.</p>
  </div>

  <script>
${scriptInner}
  <\/script>
</body>
</html>`;
}

/* Module lesson template: runnable import/export using Blob URLs */
function moduleLessonTemplate(title, moduleA, moduleB){
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui;padding:16px}
    .card{max-width:820px;margin:0 auto;border:1px solid #ddd;border-radius:16px;padding:16px}
    pre{background:#0b1020;color:#fff;padding:12px;border-radius:12px;overflow:auto}
    .muted{opacity:.7}
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    <p class="muted">This uses real ES modules via dynamic <code>import()</code> + Blob URLs.</p>
    <div id="out" class="muted"></div>
    <h4>Module A</h4>
    <pre>${escapeHtml(moduleA)}</pre>
    <h4>Module B</h4>
    <pre>${escapeHtml(moduleB)}</pre>
  </div>

  <script type="module">
    const out = document.getElementById("out");

    const codeA = ${JSON.stringify(moduleA)};
    const codeB = ${JSON.stringify(moduleB)};

    const blobA = new Blob([codeA], { type: "text/javascript" });
    const urlA = URL.createObjectURL(blobA);

    // module B can import A by placeholder then replace at runtime
    const finalB = codeB.replace("__MODULE_A_URL__", urlA);
    const blobB = new Blob([finalB], { type: "text/javascript" });
    const urlB = URL.createObjectURL(blobB);

    try{
      const mod = await import(urlB);
      out.textContent = "Loaded. Check the console for module output.";
      console.log("Module B exports:", mod);
    }catch(e){
      out.textContent = "Module load error: " + (e.message || e);
      console.error(e);
    }
  <\/script>
</body>
</html>`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================
   FULL CURRICULUM (NO QUIZZES)
   Covers: ALL items you listed
   ========================= */
const CURRICULUM = [

  /* =========================
     1) BASICS
     ========================= */
  {
    level: "Basics — Variables",
    lessons: [
      lesson("b_var_letconst","let vs const","Basics",
`let name = "Aisha";
const city = "Doha";

name = "Omar"; // allowed
// city = "Paris"; // not allowed (const)

console.log(name, "from", city);`,
explain([
"Use **const** by default. It prevents accidental re-assignment.",
"Use **let** when the variable must be reassigned (counters, changing values).",
"Rule: const = safer default."
])),
      lesson("b_var_var","var (function scope)","Basics",
`function demo(){
  var x = 1;
  if(true){
    var x = 2; // SAME variable
  }
  console.log("x:", x); // 2
}
demo();`,
explain([
"**var** is function-scoped (not block-scoped).",
"That means var inside if/for can leak within the function.",
"Modern JS prefers **let/const** to avoid this confusion."
])),
      lesson("b_var_hoist","Hoisting & TDZ (concept)","Basics",
`// Hoisting concept (don't rely on it)
console.log("Declare variables before using them.");

// let/const have TDZ (Temporal Dead Zone):
// console.log(a); // ReferenceError
// let a = 10;`,
explain([
"JavaScript processes declarations before running code (hoisting concept).",
"**let/const** exist in a **Temporal Dead Zone** until initialized.",
"Practical rule: always declare before you use."
])),
    ]
  },

  {
    level: "Basics — Data Types",
    lessons: [
      lesson("b_types_primitives","Primitive types","Basics",
`const s = "text";
const n = 42;
const b = true;
const u = undefined;
const z = null;
console.log(typeof s, typeof n, typeof b, typeof u, z);`,
explain([
"Primitive types: **string, number, boolean, null, undefined, bigint, symbol**.",
"Objects: arrays, functions, plain objects, dates, etc.",
"Knowing types helps you avoid bugs and choose correct methods."
])),
      lesson("b_types_symbol","Symbol (unique keys)","Basics",
`const id1 = Symbol("id");
const id2 = Symbol("id");

console.log(id1 === id2); // false (unique)

const user = { name: "Noor" };
user[id1] = 12345;

console.log("normal keys:", Object.keys(user)); // ["name"]
console.log("symbol value:", user[id1]);`,
explain([
"**Symbol** creates unique identifiers (even with the same description).",
"Symbols are often used as hidden/unique object keys.",
"Most beginners don't need Symbol daily, but it matters in advanced JS."
])),
      lesson("b_types_bigint","BigInt (large integers)","Basics",
`const a = 9007199254740991;  // max safe integer
const b = 9007199254740991n; // BigInt

console.log("Number:", a);
console.log("BigInt:", b);

// BigInt arithmetic:
console.log(10n + 20n);

// You cannot mix Number and BigInt directly:
// console.log(10n + 1); // TypeError`,
explain([
"Numbers have a maximum safe integer (~9e15).",
"**BigInt** handles very large integers precisely.",
"BigInt uses **n** suffix (example: 10n). Don't mix BigInt + Number without conversion."
])),
      lesson("b_types_truthy","Truthy vs Falsy (important)","Basics",
`const values = [false,true,0,1,"","hi",null,undefined,NaN,[],{}];
values.forEach(v => console.log(v, "=>", Boolean(v)));

console.log("Falsy are: false, 0, '', null, undefined, NaN");`,
explain([
"Falsy values: **false, 0, '', null, undefined, NaN**.",
"Everything else is truthy (including **[]** and **{}**).",
"This affects if/else and logical operators."
])),
      lesson("b_types_coercion","Type coercion & conversion","Basics",
`console.log("5" + 1);     // "51" (string concat)
console.log("5" - 1);     // 4 (number)
console.log(Number("42")); // 42
console.log(String(99));   // "99"

console.log(Boolean(""));  // false
console.log(Boolean("x")); // true`,
explain([
"JavaScript sometimes converts types automatically (coercion).",
"Prefer explicit conversions: **Number(), String(), Boolean()**.",
"Use **===** strict equality to avoid confusing coercion bugs."
])),
    ]
  },

  {
    level: "Basics — Operators",
    lessons: [
      lesson("b_ops_arith","Arithmetic operators","Basics",
`console.log(10 + 5);
console.log(10 - 5);
console.log(10 * 5);
console.log(10 / 5);
console.log(10 % 3); // remainder
console.log(2 ** 5); // power`,
explain([
"Arithmetic operators: **+ - * / % **.",
"% is remainder (useful for even/odd checks).",
"** is power."
])),
      lesson("b_ops_compare","Comparison & equality","Basics",
`console.log(5 == "5");   // true (coercion)
console.log(5 === "5");  // false (strict)
console.log(5 != "5");   // false (coercion)
console.log(5 !== "5");  // true (strict)

console.log(10 >= 10);
console.log(3 < 8);`,
explain([
"Prefer strict checks: **===** and **!==**.",
"== and != can surprise you due to coercion.",
"Comparisons return booleans (true/false)."
])),
      lesson("b_ops_logical","Logical operators: && || !","Basics",
`const a = true;
const b = false;

console.log(a && b); // false
console.log(a || b); // true
console.log(!a);     // false`,
explain([
"&& means 'AND' (both must be true).",
"|| means 'OR' (one true is enough).",
"! flips boolean."
])),
      lesson("b_ops_optional_nullish","Optional chaining & nullish (?. ??)","Basics",
`const user = { profile: { name: "Noor" } };

console.log(user?.profile?.name);       // "Noor"
console.log(user?.settings?.theme);     // undefined (no crash)

console.log(null ?? "fallback");        // "fallback"
console.log(undefined ?? "fallback");   // "fallback"
console.log(false ?? "fallback");       // false (NOT fallback)
console.log(false || "fallback");       // "fallback"`,
explain([
"**?.** prevents errors when properties might be missing.",
"**??** uses fallback only when value is **null/undefined**.",
"|| uses fallback for any falsy value (false, 0, '')."
])),
    ]
  },

  /* =========================
     2) CONTROL FLOW
     ========================= */
  {
    level: "Control Flow — Conditionals",
    lessons: [
      lesson("cf_ifelse","if / else / else if","Control Flow",
`const temp = 31;

if (temp < 18) console.log("Cold");
else if (temp < 28) console.log("Warm");
else console.log("Hot");`,
explain([
"if chooses a path based on a condition.",
"else if allows multiple ranges / conditions.",
"Keep conditions readable: store complex checks in variables."
])),
      lesson("cf_switch","switch","Control Flow",
`const day = "Friday";

switch(day){
  case "Monday":
    console.log("Start of week");
    break;
  case "Friday":
    console.log("Weekend soon");
    break;
  default:
    console.log("Other day");
}`,
explain([
"switch is good for many exact matches.",
"Remember **break** to avoid falling through cases.",
"default runs if no case matches."
])),
    ]
  },

  {
    level: "Control Flow — Loops",
    lessons: [
      lesson("lp_for","for loop","Loops",
`for(let i=1;i<=5;i++){
  console.log("i:", i);
}`,
explain([
"for is best when you know how many times you want to loop.",
"Common usage: iterating indexes, counting, building arrays."
])),
      lesson("lp_while","while loop","Loops",
`let n = 3;
while(n > 0){
  console.log("n:", n);
  n--;
}`,
explain([
"while runs while condition is true.",
"Use while when number of iterations is not fixed."
])),
      lesson("lp_dowhile","do…while loop","Loops",
`let tries = 0;
do{
  tries++;
  console.log("Try:", tries);
}while(tries < 3);`,
explain([
"do…while runs **at least once** before checking the condition.",
"Useful when you must execute once then decide if you continue."
])),
      lesson("lp_forof","for…of (arrays/strings)","Loops",
`const arr = ["a","b","c"];
for(const item of arr){
  console.log(item);
}

for(const ch of "JS"){
  console.log("char:", ch);
}`,
explain([
"for…of iterates **values** (arrays, strings, maps, sets).",
"Use it when you need each item directly."
])),
      lesson("lp_forin","for…in (object keys)","Loops",
`const user = { name:"Noor", city:"Doha", role:"student" };

for(const key in user){
  console.log(key, "=>", user[key]);
}`,
explain([
"for…in iterates **keys** of an object.",
"For arrays, prefer for…of or array methods, not for…in."
])),
    ]
  },

  /* =========================
     3) FUNCTIONS + SCOPE + CLOSURES
     ========================= */
  {
    level: "Functions — Core",
    lessons: [
      lesson("fn_decl","Function declaration","Functions",
`function add(a,b){
  return a + b;
}
console.log(add(2,3));`,
explain([
"Function declarations define a named function.",
"Use parameters (inputs) and return (output)."
])),
      lesson("fn_expr","Function expression","Functions",
`const multiply = function(a,b){
  return a * b;
};
console.log(multiply(3,4));`,
explain([
"Function expressions store a function in a variable.",
"Useful for passing functions around or defining conditionally."
])),
      lesson("fn_arrow","Arrow functions","Functions",
`const square = (x) => x * x;
const sum = (a,b) => {
  const s = a + b;
  return s;
};
console.log(square(5));
console.log(sum(2,8));`,
explain([
"Arrow functions are shorter and common in modern JS.",
"Important later: arrows handle **this** differently than normal functions."
])),
      lesson("fn_params_args","Parameters, arguments, default values","Functions",
`function greet(name="friend"){
  console.log("Hello", name);
}
greet();
greet("Aisha");`,
explain([
"Parameters are the variables in function definition.",
"Arguments are the real values you pass when calling.",
"Default values avoid undefined."
])),
      lesson("fn_rest","Rest parameters (...rest)","Functions",
`function total(...nums){
  return nums.reduce((s,n)=>s+n,0);
}
console.log(total(1,2,3,4));`,
explain([
"Rest collects many arguments into an array.",
"Useful for flexible functions and utilities."
])),
      lesson("fn_hof","Higher-order functions (pass functions)","Functions",
`function runTwice(fn){
  fn();
  fn();
}
runTwice(()=>console.log("Hi"));`,
explain([
"A higher-order function takes a function as argument OR returns a function.",
"This is the foundation of callbacks, events, array methods, functional patterns."
])),
      lesson("fn_returning_fn","Functions returning functions","Functions",
`function makeGreeter(prefix){
  return function(name){
    return prefix + " " + name;
  };
}
const hello = makeGreeter("Hello");
console.log(hello("Noor"));`,
explain([
"Functions can return functions (very common in closures).",
"This enables factories: create customized functions."
])),
    ]
  },

  {
    level: "Scope & Closures",
    lessons: [
      lesson("sc_scope","Global vs local scope","Scope",
`let globalX = 10;

function demo(){
  let localY = 5;
  console.log("inside:", globalX, localY);
}
demo();
// console.log(localY); // error`,
explain([
"Global scope: available everywhere (avoid too many globals).",
"Local scope: variables inside functions/blocks.",
"Keep variables close to where they are used."
])),
      lesson("sc_closure_basic","Closures (basic)","Scope",
`function makeCounter(){
  let c = 0;
  return () => ++c;
}
const counter = makeCounter();
console.log(counter(), counter(), counter());`,
explain([
"A closure happens when a function remembers variables from its outer scope.",
"This creates private state (c is private).",
"Closures are one of the most important JS concepts."
])),
      lesson("sc_closure_real","Closures (real use: private config)","Scope",
`function apiClient(baseURL){
  return {
    get(endpoint){
      return baseURL + endpoint;
    }
  };
}
const client = apiClient("https://api.example.com");
console.log(client.get("/users"));`,
explain([
"Closures are used to 'save' configuration (baseURL).",
"This is common in real-world apps and libraries."
])),
    ]
  },

  /* =========================
     4) OBJECTS & ARRAYS
     ========================= */
  {
    level: "Objects — Core",
    lessons: [
      lesson("obj_literals","Object literals & properties","Objects",
`const user = { name:"Noor", city:"Doha" };
console.log(user.name);
user.role = "student";
console.log(user);`,
explain([
"Objects store key/value pairs.",
"You can read, add, and update properties.",
"Objects represent real-world entities and structured data."
])),
      lesson("obj_methods","Methods + this keyword","Objects",
`const person = {
  name: "Omar",
  speak(){
    console.log("Hi, I am", this.name);
  }
};
person.speak();`,
explain([
"Methods are functions inside objects.",
"**this** refers to the object when called as obj.method().",
"this depends on how the function is called."
])),
      lesson("obj_bracket","Key/value access (dot vs bracket)","Objects",
`const user = { name:"Noor", city:"Doha" };

const key = "city";
console.log(user.city);      // dot
console.log(user[key]);      // bracket (dynamic)

user["job-title"] = "Guard"; // only possible with bracket notation
console.log(user);`,
explain([
"Dot notation needs a normal identifier (no spaces, no hyphen).",
"Bracket notation works with dynamic keys and special keys.",
"Use brackets when the key comes from a variable."
])),
      lesson("obj_iterate","Object.keys / values / entries","Objects",
`const user = { name:"Noor", city:"Doha", role:"student" };

console.log(Object.keys(user));
console.log(Object.values(user));
console.log(Object.entries(user));

for (const [k,v] of Object.entries(user)){
  console.log(k, "=>", v);
}`,
explain([
"Object.keys gives array of keys, Object.values gives values, Object.entries gives [key,value].",
"Common for rendering UI lists from object data."
])),
      lesson("obj_destructure","Object destructuring","Objects",
`const user = { name:"Noor", city:"Doha", role:"student" };
const { name, city } = user;
console.log(name, city);`,
explain([
"Destructuring extracts properties into variables quickly.",
"Common in modern JS and React."
])),
    ]
  },

  {
    level: "Arrays — Core + Methods",
    lessons: [
      lesson("arr_create_access","Array creation & access","Arrays",
`const items = ["apple","mango","banana"];
console.log(items[0]);
console.log("length:", items.length);`,
explain([
"Arrays store ordered lists.",
"Access by index (0-based).",
"length tells number of items."
])),
      lesson("arr_push_pop","push & pop (end of array)","Arrays",
`const stack = [];
stack.push("A");
stack.push("B");
stack.push("C");

console.log("stack:", stack);

const last = stack.pop();
console.log("popped:", last);
console.log("after:", stack);`,
explain([
"push adds to the END, pop removes from the END.",
"Very common for stacks and building arrays."
])),
      lesson("arr_shift_unshift","shift & unshift (start of array)","Arrays",
`const q = ["A","B","C"];

q.unshift("FIRST"); // add to start
console.log(q);

const removed = q.shift(); // remove from start
console.log("removed:", removed);
console.log("after:", q);`,
explain([
"unshift adds to START, shift removes from START.",
"Be careful: shift/unshift can be slower for very large arrays."
])),
      lesson("arr_foreach","forEach (loop helper)","Arrays",
`const nums = [1,2,3];
nums.forEach((n, i) => {
  console.log("index", i, "value", n);
});`,
explain([
"forEach runs a function for each item.",
"It does NOT return a new array (use map for that)."
])),
      lesson("arr_map_filter_reduce","map / filter / reduce","Arrays",
`const prices = [10,25,40];

console.log("map x2:", prices.map(p => p * 2));
console.log("filter >=25:", prices.filter(p => p >= 25));
console.log("reduce sum:", prices.reduce((sum,p) => sum + p, 0));`,
explain([
"map transforms into a new array.",
"filter keeps items that match a condition.",
"reduce combines into one value (sum, object, etc.)."
])),
      lesson("arr_find_some_every","find / some / every","Arrays",
`const users = [
  {name:"Noor", age:22},
  {name:"Omar", age:17},
  {name:"Aisha", age:25},
];

console.log("find first adult:", users.find(u => u.age >= 18));
console.log("some under 18?:", users.some(u => u.age < 18));
console.log("every adult?:", users.every(u => u.age >= 18));`,
explain([
"find returns the first matching item (or undefined).",
"some checks if at least one matches.",
"every checks if all match."
])),
      lesson("arr_destructure","Array destructuring","Arrays",
`const arr = [10, 20, 30];
const [a, b] = arr;
console.log(a, b);`,
explain([
"Array destructuring extracts by position (index order).",
"Useful for swapping and reading pairs."
])),
      lesson("arr_spread_rest","Spread & rest with arrays","Arrays",
`const a = [1,2];
const b = [...a, 3,4];
console.log(b);

function sum(...nums){
  return nums.reduce((s,n)=>s+n,0);
}
console.log(sum(1,2,3));`,
explain([
"Spread (...) copies items into a new array.",
"Rest (...) collects parameters into an array.",
"Great for immutability and flexible functions."
])),
      lesson("arr_immutable","Immutable data handling (important)","Arrays",
`const arr = [1,2,3];

// Don't mutate if you want predictable state:
// arr.push(4);

// Instead create new:
const next = [...arr, 4];

console.log("original:", arr);
console.log("new:", next);`,
explain([
"Immutability means you create NEW arrays/objects instead of changing existing ones.",
"This avoids many bugs in UI frameworks (React, etc.)."
])),
    ]
  },

  /* =========================
     5) DOM MANIPULATION
     ========================= */
  {
    level: "DOM Manipulation — Select & Modify",
    lessons: [
      lesson("dom_selectors","Selectors: querySelector / getElementById / getElementsByClassName","DOM",
htmlLessonTemplate(
  "Selecting DOM elements",
  `
  <div class="row">
    <button id="btn1">querySelector</button>
    <button id="btn2">getElementById</button>
    <button id="btn3">getElementsByClassName</button>
  </div>
  <p id="msg" class="box">Message will change here.</p>
  <p class="tag box">Tag A</p>
  <p class="tag box">Tag B</p>
  `,
  `
  const msg = document.querySelector("#msg");

  document.querySelector("#btn1").addEventListener("click", () => {
    const el = document.querySelector(".tag");
    msg.textContent = "querySelector picked: " + el.textContent;
  });

  document.getElementById("btn2").addEventListener("click", () => {
    const el = document.getElementById("msg");
    el.style.borderColor = "#6b5cff";
    el.style.background = "#f8f7ff";
    msg.textContent = "getElementById updated styles + text.";
  });

  document.getElementById("btn3").addEventListener("click", () => {
    const list = document.getElementsByClassName("tag"); // HTMLCollection
    msg.textContent = "getElementsByClassName length: " + list.length;
  });
  `
),
explain([
"DOM = the page structure (elements).",
"querySelector uses CSS selectors and returns the first match.",
"getElementById is fast and direct for #id elements.",
"getElementsByClassName returns a live HTMLCollection (not a real array)."
]),
"html"),

      lesson("dom_modify","Modify: textContent vs innerHTML vs style","DOM",
htmlLessonTemplate(
  "Modifying elements safely",
  `
  <div class="row">
    <input id="name" placeholder="Type a name"/>
    <button id="safe">Safe (textContent)</button>
    <button id="unsafe">Unsafe (innerHTML)</button>
  </div>

  <div id="out" class="box"></div>
  `,
  `
  const out = document.getElementById("out");
  const nameInput = document.getElementById("name");

  document.getElementById("safe").addEventListener("click", () => {
    out.textContent = "Hello " + (nameInput.value || "friend") + "!";
    out.style.borderColor = "#0bb07b";
  });

  document.getElementById("unsafe").addEventListener("click", () => {
    // innerHTML can run injected HTML if user input includes tags
    out.innerHTML = "Hello <strong>" + (nameInput.value || "friend") + "</strong>!";
    out.style.borderColor = "#ff4d6d";
  });
  `
),
explain([
"textContent sets plain text (safe from HTML injection).",
"innerHTML parses HTML (powerful but can be unsafe with user input).",
"style lets you change CSS directly (small changes). For many changes, prefer CSS classes."
]),
"html"),
    ]
  },

  {
    level: "DOM Manipulation — Create & Remove",
    lessons: [
      lesson("dom_create_remove","Create & remove elements dynamically","DOM",
htmlLessonTemplate(
  "Create & remove items",
  `
  <div class="row">
    <input id="item" placeholder="New item"/>
    <button id="add">Add</button>
    <button id="clear">Clear</button>
  </div>
  <ul id="list" class="box"></ul>
  `,
  `
  const list = document.getElementById("list");
  const item = document.getElementById("item");

  function addItem(text){
    const li = document.createElement("li");
    li.textContent = text;

    // remove button
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.style.marginLeft = "10px";
    btn.addEventListener("click", () => li.remove());

    li.appendChild(btn);
    list.appendChild(li);
  }

  document.getElementById("add").addEventListener("click", () => {
    const v = item.value.trim();
    if(!v) return;
    addItem(v);
    item.value = "";
    item.focus();
  });

  document.getElementById("clear").addEventListener("click", () => {
    list.innerHTML = "";
  });
  `
),
explain([
"Create elements using document.createElement().",
"Append using appendChild/append.",
"Remove using element.remove() or clearing parent.innerHTML.",
"This is the foundation of dynamic UI."
]),
"html"),
    ]
  },

  /* =========================
     6) EVENTS
     ========================= */
  {
    level: "Events — Event object, bubbling & capturing",
    lessons: [
      lesson("ev_event_object","Event object (e) + target + preventDefault","Events",
htmlLessonTemplate(
  "Event object basics",
  `
  <form id="form" class="box">
    <div class="row">
      <input id="email" placeholder="Type email"/>
      <button type="submit">Submit</button>
    </div>
    <p class="muted">This form will NOT reload the page because we use preventDefault().</p>
  </form>
  <div id="out" class="box"></div>
  `,
  `
  const form = document.getElementById("form");
  const out = document.getElementById("out");

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // stop page refresh
    const email = document.getElementById("email").value.trim();
    out.textContent = "Submitted email: " + (email || "(empty)");
    console.log("Event type:", e.type);
    console.log("Event target:", e.target.id);
  });
  `
),
explain([
"The event object (often named e) contains details about what happened.",
"e.target is the element that triggered the event.",
"preventDefault() stops default browser action (like form reload)."
]),
"html"),

      lesson("ev_bubble_capture","Event bubbling & capturing (with demo)","Events",
htmlLessonTemplate(
  "Bubbling vs Capturing",
  `
  <div id="outer" class="box">
    Outer
    <div id="inner" class="box">Inner (click me)</div>
  </div>

  <p class="muted">Open console. Capturing fires first, then target, then bubbling.</p>
  `,
  `
  const outer = document.getElementById("outer");
  const inner = document.getElementById("inner");

  // Capturing (true)
  outer.addEventListener("click", () => console.log("OUTER capture"), true);

  // Bubbling (default false)
  outer.addEventListener("click", () => console.log("OUTER bubble"));
  inner.addEventListener("click", (e) => {
    console.log("INNER (target)");
    // e.stopPropagation(); // try this to stop bubbling
  });
  `
),
explain([
"Most events bubble: target → parent → grandparent → ...",
"Capturing is the reverse: top → down to target (use addEventListener(..., true)).",
"stopPropagation() stops the event from continuing up/down."
]),
"html"),

      lesson("ev_inline_vs_listener","Inline events vs addEventListener","Events",
`console.log("Inline events: <button onclick='...'> (avoid in modern apps)");
console.log("Prefer addEventListener: keeps JS separate and cleaner.");
console.log("Inline is harder to maintain, test, and reuse.");`,
explain([
"Inline events mix HTML and JS (harder to maintain).",
"addEventListener keeps logic in JS and supports multiple handlers cleanly.",
"Modern best practice: prefer addEventListener."
])),
    ]
  },

  /* =========================
     7) ADVANCED CONCEPTS
     ========================= */
  {
    level: "Advanced Concepts — this, prototypes, classes",
    lessons: [
      lesson("adv_this_rules","this keyword (common rules)","Advanced",
`const obj = {
  name: "Noor",
  normal(){ console.log("normal this.name:", this.name); },
  arrow: () => console.log("arrow this:", this)
};

obj.normal();
obj.arrow();

const fn = obj.normal;
fn(); // this is undefined in strict mode (or window in old non-strict)`,
explain([
"**this** depends on HOW a function is called.",
"obj.method() -> this = obj.",
"Arrow functions do NOT have their own this; they capture from outer scope.",
"Calling a function directly fn() loses the object context."
])),
      lesson("adv_proto","Prototypes & inheritance (concept)","Advanced",
`function Person(name){
  this.name = name;
}
Person.prototype.greet = function(){
  console.log("Hi", this.name);
};

const p = new Person("Omar");
p.greet();

console.log("Has greet?", p.hasOwnProperty("greet")); // false (from prototype)`,
explain([
"JS inheritance is based on **prototypes**.",
"Methods can live on prototype to be shared across instances.",
"This explains built-in methods like Array.prototype.map."
])),
      lesson("adv_class","class syntax","Advanced",
`class User{
  constructor(name){
    this.name = name;
  }
  greet(){
    console.log("Hello", this.name);
  }
}
const u = new User("Aisha");
u.greet();`,
explain([
"Classes are cleaner syntax over prototypes.",
"constructor runs when you create with new.",
"Methods are shared (like prototype methods)."
])),
      lesson("adv_inheritance","Class inheritance (simple)","Advanced",
`class Animal{
  constructor(name){ this.name = name; }
  speak(){ console.log(this.name, "makes a sound"); }
}
class Dog extends Animal{
  speak(){ console.log(this.name, "barks"); }
}
const d = new Dog("Rex");
d.speak();`,
explain([
"extends creates a prototype chain between classes.",
"Overriding methods allows customizing behavior.",
"Use inheritance carefully (composition is often better)."
])),
    ]
  },

  {
    level: "Advanced Concepts — Error Handling",
    lessons: [
      lesson("err_trycatchfinally","try…catch…finally","Errors",
`try{
  console.log("try start");
  JSON.parse("{bad json}");
}catch(e){
  console.log("caught:", e.message);
}finally{
  console.log("finally always runs");
}`,
explain([
"try: code that may fail.",
"catch: handle error without crashing app.",
"finally: runs whether success or error (cleanup)."
])),
      lesson("err_throw","throw custom errors","Errors",
`function requireEmail(email){
  if(!email) throw new Error("Email is required");
  if(!email.includes("@")) throw new Error("Email must contain @");
  return email;
}

try{
  console.log(requireEmail("test@example.com"));
  console.log(requireEmail("bad"));
}catch(e){
  console.log("Error:", e.message);
}`,
explain([
"Throw when input is invalid or logic must stop.",
"This makes functions predictable.",
"Catch at boundaries (UI, API, main flow)."
])),
    ]
  },

  {
    level: "Advanced Concepts — Modules (import/export)",
    lessons: [
      lesson("mod_import_export","Modules: import/export (real runnable demo)","Modules",
moduleLessonTemplate(
  "ES Modules demo (export + import)",
  `// Module A (math.js)
export function add(a,b){ return a+b; }
export function mul(a,b){ return a*b; }
export const PI = 3.14159;`,
  `// Module B (app.js)
import { add, mul, PI } from "__MODULE_A_URL__";

console.log("add:", add(2,3));
console.log("mul:", mul(3,4));
console.log("PI:", PI);

export const ok = true;`
),
explain([
"Modules let you split code into files using **export** and **import**.",
"In real projects: file A exports functions, file B imports them.",
"Bundlers (Webpack/Vite) package modules for production."
]),
"html"),
      lesson("mod_bundlers","Bundlers: Webpack & Vite (concept)","Modules",
`console.log("Bundlers combine many module files into optimized bundles.");
console.log("Vite = fast dev server + build tool.");
console.log("Webpack = powerful bundler used widely in big projects.");`,
explain([
"Bundlers help browsers load code efficiently (one/few files instead of hundreds).",
"They also support transforms (TypeScript, JSX), minification, tree-shaking.",
"Even if you don’t use backend, understanding bundlers helps you understand real projects."
])),
    ]
  },

  /* =========================
     8) ASYNCHRONOUS JAVASCRIPT
     ========================= */
  {
    level: "Asynchronous JavaScript",
    lessons: [
      lesson("async_callbacks","Callbacks (timers)","Async",
`console.log("Start");
setTimeout(() => console.log("Timer callback"), 300);
console.log("End");`,
explain([
"Callbacks are functions executed later.",
"setTimeout schedules a callback after a delay.",
"Async changes the order of execution."
])),
      lesson("async_promises","Promises","Async",
`function wait(ms){
  return new Promise(res => setTimeout(res, ms));
}
wait(300)
  .then(() => console.log("Promise resolved"))
  .catch(err => console.log("Promise error:", err));`,
explain([
"A Promise represents a future result (resolve/reject).",
"then handles success, catch handles error.",
"Promises avoid deep nested callbacks."
])),
      lesson("async_await","async / await","Async",
`function wait(ms){
  return new Promise(res => setTimeout(res, ms));
}

async function run(){
  console.log("A");
  await wait(250);
  console.log("B");
}
run();`,
explain([
"async/await is clean syntax on top of promises.",
"await pauses inside the async function until the promise resolves.",
"Use try/catch to handle errors with await."
])),
      lesson("async_fetch_get","Fetch API (GET) — real example","Async",
`async function load(){
  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  console.log("status:", res.status);

  const data = await res.json();
  console.log("data:", data);
}
load();`,
explain([
"fetch makes HTTP requests and returns a Promise.",
"res.json() parses JSON response into a JS object.",
"This uses a public demo API (JSONPlaceholder)."
])),
      lesson("async_fetch_post","Fetch API (POST) — sending JSON","Async",
`async function send(){
  const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title:"Hello", body:"World", userId: 1 })
  });

  const data = await res.json();
  console.log("created:", data);
}
send();`,
explain([
"POST sends data to a server.",
"Use headers Content-Type: application/json when sending JSON.",
"Always validate and sanitize on the server in real apps."
])),
    ]
  },

  /* =========================
     9) BROWSER STORAGE
     ========================= */
  {
    level: "Browser Storage — localStorage, sessionStorage, cookies",
    lessons: [
      lesson("store_local","localStorage","Storage",
`localStorage.setItem("demo","hello");
console.log(localStorage.getItem("demo"));
localStorage.removeItem("demo");`,
explain([
"localStorage persists even after browser restart.",
"It stores strings only.",
"Good for settings, small caches, progress tracking."
])),
      lesson("store_session","sessionStorage","Storage",
`sessionStorage.setItem("demo","hi");
console.log(sessionStorage.getItem("demo"));
sessionStorage.removeItem("demo");`,
explain([
"sessionStorage persists only in the current tab session.",
"When the tab closes, it is cleared.",
"Useful for temporary state."
])),
      lesson("store_cookies","Cookies (basic)","Storage",
htmlLessonTemplate(
  "Cookies basics",
  `
  <div class="row">
    <button id="set">Set cookie</button>
    <button id="read">Read cookies</button>
    <button id="clear">Clear cookie</button>
  </div>
  <pre id="out" class="box"></pre>
  `,
  `
  const out = document.getElementById("out");

  document.getElementById("set").addEventListener("click", () => {
    document.cookie = "theme=dark; max-age=3600; path=/";
    out.textContent = "Cookie set: theme=dark";
  });

  document.getElementById("read").addEventListener("click", () => {
    out.textContent = "document.cookie =>\\n" + document.cookie;
  });

  document.getElementById("clear").addEventListener("click", () => {
    // expire it
    document.cookie = "theme=; max-age=0; path=/";
    out.textContent = "Cookie cleared.";
  });
  `
),
explain([
"Cookies are small key/value strings sent to the server automatically (depending on settings).",
"Used for sessions/auth historically.",
"Security flags exist: HttpOnly, Secure, SameSite (server-controlled)."
]),
"html"),
    ]
  },

  /* =========================
     10) ES6+ FEATURES (explicit)
     ========================= */
  {
    level: "ES6+ Features (Modern JS)",
    lessons: [
      lesson("es6_template","Template literals","ES6+",
`const name = "Noor";
const city = "Doha";

console.log("Old:", "Hello " + name + " from " + city);
console.log("Template:", \`Hello \${name} from \${city}\`);`,
explain([
"Template literals use backticks: `...`",
"They support interpolation with ${...}",
"They are cleaner than string concatenation."
])),
      lesson("es6_defaults","Default parameters","ES6+",
`function greet(name="friend"){
  return "Hello " + name;
}
console.log(greet());
console.log(greet("Aisha"));`,
explain([
"Default parameters set a value if argument is undefined.",
"Helps avoid manual checks inside functions."
])),
      lesson("es6_letconst","let & const (modern standard)","ES6+",
`const a = 1;
// a = 2; // error

let b = 1;
b = 2; // ok
console.log(a,b);`,
explain([
"ES6 introduced let and const.",
"Use const by default, let when reassignment is needed."
])),
      lesson("es6_arrow","Arrow functions (modern usage)","ES6+",
`const nums = [1,2,3];
const doubled = nums.map(n => n * 2);
console.log(doubled);`,
explain([
"Arrow functions are concise and perfect for callbacks.",
"Used heavily with array methods and React."
])),
      lesson("es6_modules_repeat","Modules (import/export) recap","ES6+",
`console.log("Modules recap: export from one file, import in another.");
console.log("In this platform, see the Modules section for runnable demo.");`,
explain([
"Modules are ES6+ feature used everywhere in modern JS apps.",
"Bundlers help browsers load modules efficiently."
])),
    ]
  },

  /* =========================
     11) MISC: JSON, REGEX, DATE, MATH
     ========================= */
  {
    level: "Misc — JSON, Regex, Date/Time, Math",
    lessons: [
      lesson("misc_json","JSON parse & stringify","Misc",
`const json = '{"name":"Noor","age":22}';
const obj = JSON.parse(json);
console.log(obj.name, obj.age);

const back = JSON.stringify(obj);
console.log(back);`,
explain([
"JSON is text format for data exchange.",
"JSON.parse converts JSON string -> object.",
"JSON.stringify converts object -> JSON string."
])),
      lesson("misc_regex","Regular expressions (basic)","Misc",
`const text = "Email: test@example.com, Phone: 123-456";
const email = text.match(/[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}/);
console.log("email:", email?.[0]);

const replaced = text.replace(/\\d/g, "X");
console.log("digits replaced:", replaced);`,
explain([
"Regex is pattern matching for strings.",
"match finds patterns, replace can transform text.",
"Use regex carefully: keep patterns readable and tested."
])),
      lesson("misc_date","Date & time basics","Misc",
`const now = new Date();
console.log("ISO:", now.toISOString());
console.log("Year:", now.getFullYear());
console.log("Month (0-11):", now.getMonth());
console.log("Day:", now.getDate());

const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
console.log("3 days later:", future.toDateString());`,
explain([
"Date represents time.",
"toISOString is good for storage.",
"Months are 0-11 (January = 0)."
])),
      lesson("misc_math","Math & number utilities","Misc",
`console.log("random 0-1:", Math.random());
console.log("round:", Math.round(4.6));
console.log("floor:", Math.floor(4.9));
console.log("ceil:", Math.ceil(4.1));
console.log("max:", Math.max(1,9,3));
console.log("min:", Math.min(1,9,3));

const n = 49.995;
console.log("toFixed(2):", n.toFixed(2));`,
explain([
"Math provides utilities for rounding and random numbers.",
"toFixed formats decimals (returns string).",
"Be careful: floating point is not perfect for money (use integer cents or BigInt in some cases)."
])),
    ]
  },

  /* =========================
     EXTRA ADVANCED: MEMORY/PERF, EVENT LOOP, SECURITY, PATTERNS, TESTING, REST
     ========================= */
  {
    level: "Memory & Performance",
    lessons: [
      lesson("perf_dom_batch","Optimize DOM manipulation (batching)","Performance",
htmlLessonTemplate(
  "Batch DOM updates with DocumentFragment",
  `
  <div class="row">
    <button id="slow">Slow add 500</button>
    <button id="fast">Fast add 500</button>
  </div>
  <ul id="list" class="box"></ul>
  <p class="muted">Open console to see timing.</p>
  `,
  `
  const list = document.getElementById("list");

  function clear(){ list.innerHTML = ""; }

  document.getElementById("slow").addEventListener("click", () => {
    clear();
    console.time("slow");
    for(let i=1;i<=500;i++){
      const li = document.createElement("li");
      li.textContent = "Item " + i;
      list.appendChild(li); // many DOM writes
    }
    console.timeEnd("slow");
  });

  document.getElementById("fast").addEventListener("click", () => {
    clear();
    console.time("fast");
    const frag = document.createDocumentFragment();
    for(let i=1;i<=500;i++){
      const li = document.createElement("li");
      li.textContent = "Item " + i;
      frag.appendChild(li); // build off-DOM
    }
    list.appendChild(frag); // single DOM write
    console.timeEnd("fast");
  });
  `
),
explain([
"DOM updates are expensive. Doing many small updates can slow the page.",
"Batch updates using DocumentFragment then append once.",
"This is a real performance pattern used in production."
]),
"html"),

      lesson("perf_leaks","Memory leaks (common causes)","Performance",
`console.log("Common memory leaks:");
console.log("1) Not removing event listeners when elements are removed");
console.log("2) Storing huge arrays/objects globally and never clearing");
console.log("3) Keeping references in closures longer than needed");

console.log("Fix: remove listeners, null references, avoid global caches.");`,
explain([
"Memory leaks happen when references stay alive so garbage collector can’t free memory.",
"Most common in apps: listeners not cleaned up, huge caches, long-lived closures.",
"Practical: clean up intervals, listeners, and references."
])),
      lesson("perf_gc","Garbage collection (concept)","Performance",
`console.log("Garbage collection frees memory for objects that are no longer reachable.");
console.log("If something is still referenced, it won't be collected.");
console.log("Your job: avoid unnecessary references (especially global).");`,
explain([
"JS engine uses garbage collection automatically.",
"Objects are freed when they become unreachable (no references).",
"Leaky code keeps references alive unintentionally."
])),
    ]
  },

  {
    level: "Event Loop & JS Engine",
    lessons: [
      lesson("loop_single_thread","Single-threaded execution (concept)","Event Loop",
`console.log("JavaScript executes on a single main thread.");
console.log("Async tasks are scheduled, then run later when the call stack is free.");`,
explain([
"JavaScript runs single-threaded (one call stack).",
"Async works by scheduling tasks (timers, fetch callbacks) to run later."
])),
      lesson("loop_stack_queue","Call stack, task queue, microtasks (demo)","Event Loop",
`console.log("1) sync start");

setTimeout(()=>console.log("4) macrotask (setTimeout)"), 0);

Promise.resolve().then(()=>console.log("3) microtask (promise)"));

console.log("2) sync end");`,
explain([
"Order: synchronous code first.",
"Then microtasks (Promise callbacks).",
"Then macrotasks (setTimeout, events). This explains async ordering."
])),
      lesson("loop_sync_async","Synchronous vs asynchronous (mental model)","Event Loop",
`console.log("Sync runs now.");
console.log("Async is scheduled to run later.");
console.log("If you block the thread, UI freezes (avoid long loops).");`,
explain([
"Sync: runs immediately, blocks until done.",
"Async: schedules work to happen later without blocking the main thread.",
"Heavy loops freeze UI — split work, batch DOM, or use web workers (advanced)."
])),
    ]
  },

  {
    level: "Security Basics",
    lessons: [
      lesson("sec_xss","XSS (Cross-site scripting) basics","Security",
htmlLessonTemplate(
  "XSS: why innerHTML is risky",
  `
  <div class="row">
    <input id="input" placeholder="Type something (try: <b>bold</b>)" style="flex:1"/>
    <button id="safe">Safe render</button>
    <button id="unsafe">Unsafe render</button>
  </div>
  <div id="out" class="box"></div>
  <p class="muted">This is educational: do not render user input with innerHTML in real apps.</p>
  `,
  `
  const input = document.getElementById("input");
  const out = document.getElementById("out");

  document.getElementById("safe").addEventListener("click", () => {
    out.textContent = input.value; // safe
    out.classList.remove("danger");
  });

  document.getElementById("unsafe").addEventListener("click", () => {
    out.innerHTML = input.value; // risky
    out.classList.add("danger");
  });
  `
),
explain([
"XSS happens when attackers inject scripts into pages.",
"Using innerHTML with untrusted input can allow injection.",
"Safer: textContent, or sanitize/escape on server + client."
]),
"html"),

      lesson("sec_csrf","CSRF basics (concept)","Security",
`console.log("CSRF = tricking a logged-in user to make unwanted requests.");
console.log("Defense: SameSite cookies, CSRF tokens, checking Origin/Referer.");
console.log("Usually handled on the server, but front-end should understand it.");`,
explain([
"CSRF targets authenticated sessions (cookies auto-sent).",
"Best defenses are server-side: SameSite cookies and CSRF tokens.",
"Front-end must send tokens if required."
])),

      lesson("sec_validation","Input validation & escaping (basics)","Security",
`function isValidEmail(email){
  if(typeof email !== "string") return false;
  const e = email.trim();
  return e.includes("@") && e.includes(".");
}

console.log(isValidEmail("test@example.com"));
console.log(isValidEmail("bad"));`,
explain([
"Validate input early (client) for user experience, and always validate on server for security.",
"Escaping means converting special characters so they are treated as text, not HTML/SQL/etc.",
"Never trust user input."
])),
    ]
  },

  {
    level: "Advanced Patterns",
    lessons: [
      lesson("pat_singleton","Singleton pattern","Patterns",
`const Singleton = (function(){
  let instance = null;
  function create(){
    return { createdAt: Date.now() };
  }
  return {
    getInstance(){
      if(!instance) instance = create();
      return instance;
    }
  };
})();

const a = Singleton.getInstance();
const b = Singleton.getInstance();
console.log(a === b, a);`,
explain([
"Singleton ensures only one instance exists.",
"Used for configs, logging services, app-level stores.",
"Use carefully: too many singletons can make code hard to test."
])),
      lesson("pat_observer","Observer pattern (pub/sub)","Patterns",
`function createBus(){
  const listeners = new Map();
  return {
    on(event, fn){
      if(!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    emit(event, payload){
      (listeners.get(event) || []).forEach(fn => fn(payload));
    }
  };
}

const bus = createBus();
bus.on("login", user => console.log("welcome", user));
bus.emit("login", "Noor");`,
explain([
"Observer = subscribers listen for events, publishers emit events.",
"Used in UI frameworks, state management, notifications.",
"This is a clean way to decouple parts of your app."
])),
      lesson("pat_module_pattern","Module pattern (privacy via closures)","Patterns",
`const CounterModule = (function(){
  let c = 0; // private
  return {
    inc(){ c++; },
    get(){ return c; }
  };
})();

CounterModule.inc();
CounterModule.inc();
console.log(CounterModule.get());`,
explain([
"Module pattern uses closures to create private state.",
"This was popular before ES Modules; concept still matters.",
"Same idea appears in factories and encapsulation."
])),
      lesson("pat_fp_pure","Functional concepts: pure functions","Patterns",
`function add(a,b){
  return a + b; // pure: no side effects, same input -> same output
}

let x = 0;
function impure(){
  x++; // side effect
  return x;
}

console.log(add(2,3));
console.log(impure(), impure());`,
explain([
"Pure functions are predictable and easier to test.",
"Avoid hidden side effects when possible.",
"Array methods (map/filter/reduce) fit functional style well."
])),
    ]
  },

  {
    level: "Testing & Debugging",
    lessons: [
      lesson("dbg_console_tools","Console methods beyond log","Debugging",
`const users = [
  {name:"Noor", age:22},
  {name:"Omar", age:17},
];

console.table(users);

console.time("work");
let sum = 0;
for(let i=0;i<100000;i++) sum += i;
console.timeEnd("work");

console.group("Grouped logs");
console.log("A");
console.log("B");
console.groupEnd();`,
explain([
"console.table = great for arrays/objects.",
"console.time/timeEnd = performance timing.",
"console.group makes logs cleaner."
])),
      lesson("dbg_debugger","Debugger (concept)","Debugging",
`console.log("Use Chrome DevTools or VS Code debugger.");
console.log("Add 'debugger;' in code to pause execution when DevTools is open.");

function demo(a,b){
  // debugger; // uncomment in real debugging session
  return a + b;
}
console.log(demo(2,3));`,
explain([
"Debugger lets you pause, step through code, inspect variables.",
"In Chrome DevTools: Sources tab.",
"In VS Code: Run and Debug."
])),
      lesson("dbg_unit_test","Unit testing basics (simple assert)","Debugging",
`function assertEqual(actual, expected, msg){
  if(actual !== expected){
    throw new Error("FAIL: " + msg + " (got " + actual + ", expected " + expected + ")");
  }
  console.log("PASS:", msg);
}

function add(a,b){ return a+b; }

assertEqual(add(2,3), 5, "add should sum numbers");
assertEqual(add(-1,1), 0, "add should handle negatives");`,
explain([
"Unit tests verify small functions behave correctly.",
"In real projects use frameworks like Jest/Vitest, but the mindset is the same.",
"Tests prevent regressions when you change code."
])),
    ]
  },

  {
    level: "APIs & REST + JSON (Deep)",
    lessons: [
      lesson("api_rest_basics","REST basics (concept)","APIs",
`console.log("REST APIs commonly use:");
console.log("GET /items (read)");
console.log("POST /items (create)");
console.log("PUT/PATCH /items/:id (update)");
console.log("DELETE /items/:id (delete)");

console.log("HTTP status examples: 200 OK, 201 Created, 404 Not Found, 500 Server Error");`,
explain([
"REST APIs are standard ways to communicate between front-end and server.",
"Methods: GET/POST/PUT/PATCH/DELETE.",
"Status codes tell success/failure."
])),
      lesson("api_json_deep","Understanding JSON deeply","APIs",
`const obj = {
  name: "Noor",
  age: 22,
  skills: ["js","dom"],
  meta: { active: true }
};

const json = JSON.stringify(obj, null, 2);
console.log(json);

const back = JSON.parse(json);
console.log(back.meta.active);`,
explain([
"JSON supports: objects, arrays, strings, numbers, booleans, null.",
"JSON does NOT support: functions, undefined, Symbol, BigInt (without conversion).",
"Use JSON.stringify(value, null, 2) to pretty-print."
])),
    ]
  },
];

/* UI Components */
function Sidebar({
  query, setQuery, filtered,
  activeId, setActiveId,
  doneMap, doneCount, totalLessons, progressPct
}){
  return (
    <aside className="sidebar">
      <div className="sideHead">
        <h2>Curriculum</h2>
        <div className="search">
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Search lessons (e.g., closure, DOM, async)…"
            aria-label="Search lessons"
          />
        </div>
        <div className="progressRow">
          <span><strong>{doneCount}</strong> / {totalLessons}</span>
          <div className="bar" aria-label="Progress">
            <div style={{width: progressPct + "%"}}></div>
          </div>
          <span style={{minWidth:42, textAlign:"right"}}>{progressPct}%</span>
        </div>
      </div>

      <div className="lessonList" aria-label="Lesson list">
        {filtered.map(sec => (
          <div key={sec.level}>
            <div className="sectionTitle">{sec.level}</div>
            {sec.lessons.map(l => (
              <button
                key={l.id}
                className={"lessonBtn" + (l.id === activeId ? " active" : "")}
                onClick={() => setActiveId(l.id)}
                type="button"
              >
                <div className="lessonTop">
                  <div className="lessonName">{l.title}</div>
                  <span className={"tick" + (doneMap[l.id] ? " done" : "")} aria-hidden="true"></span>
                </div>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  <span className="badge">{l.topic}</span>
                  <span className="badge">{l.defaultLang === "html" ? "HTML + JS" : "JS"}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

function App(){
  const flatLessons = useMemo(() => {
    const arr=[];
    CURRICULUM.forEach(sec => sec.lessons.forEach(l => arr.push({ ...l, section: sec.level })));
    return arr;
  }, []);

  const [doneMap, setDoneMap] = useState(()=>readLS(LS.DONE, {}));
  const [query, setQuery] = useState("");

  const [activeId, setActiveId] = useState(()=>readLS(LS.LAST, flatLessons[0]?.id || "b_var_letconst"));
  const activeLesson = useMemo(()=> flatLessons.find(l=>l.id===activeId) || flatLessons[0], [activeId, flatLessons]);

  const [mode, setMode] = useState("js");
  const [code, setCode] = useState("");
  const [consoleLines, setConsoleLines] = useState([{level:"dim", text:"Console output appears here."}]);

  const iframeRef = useRef(null);

  /* Load lesson + saved code */
  useEffect(()=>{
    const all = readLS(LS.CODE, {});
    const saved = all[activeId];
    const l = flatLessons.find(x => x.id === activeId) || flatLessons[0];

    setMode(saved?.lang || l.defaultLang || "js");
    setCode(saved?.code || l.starterCode || "");
    setConsoleLines([{level:"dim", text:"Console output appears here."}]);

    writeLS(LS.LAST, activeId);
  },[activeId, flatLessons]);

  /* Listen for iframe console */
  useEffect(()=>{
    function onMsg(e){
      const d = e.data;
      if(!d || !d.__JSACADEMY__) return;

      if(d.type==="console"){
        const level = d.payload.level;
        const text = (d.payload.args || []).join(" ");
        setConsoleLines(prev => {
          const next = prev.filter(x=>x.level!=="dim");
          next.push({level, text});
          return next.slice(-250);
        });
      }
      if(d.type==="error"){
        setConsoleLines(prev => {
          const next = prev.filter(x=>x.level!=="dim");
          next.push({level:"bad", text:"Error: " + (d.payload.message || "Unknown error")});
          return next.slice(-250);
        });
      }
    }
    window.addEventListener("message", onMsg);
    return ()=>window.removeEventListener("message", onMsg);
  },[]);

  const totalLessons = flatLessons.length;
  const doneCount = useMemo(()=>Object.values(doneMap).filter(Boolean).length, [doneMap]);
  const progressPct = totalLessons ? Math.round((doneCount/totalLessons)*100) : 0;

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if(!q) return CURRICULUM;
    return CURRICULUM.map(sec => ({
      ...sec,
      lessons: sec.lessons.filter(l => {
        const hay = `${sec.level} ${l.title} ${l.topic}`.toLowerCase();
        return hay.includes(q);
      })
    })).filter(sec => sec.lessons.length);
  },[query]);

  function saveCode(){
    const all = readLS(LS.CODE, {});
    all[activeId] = { lang: mode, code };
    writeLS(LS.CODE, all);
  }

  function run(){
    saveCode();
    setConsoleLines([{level:"dim", text:"Running…"}]);
    const html = buildSandboxHTML({mode, code});
    iframeRef.current.srcdoc = html;
  }

  function markDone(){
    const next = {...doneMap, [activeId]: true};
    setDoneMap(next);
    writeLS(LS.DONE, next);
  }

  /* Reset all button */
  useEffect(()=>{
    const resetAllBtn = document.getElementById("resetAllBtn");
    const resetAll = ()=>{
      if(!confirm("Reset all progress and saved code?")) return;
      localStorage.removeItem(LS.DONE);
      localStorage.removeItem(LS.CODE);
      localStorage.removeItem(LS.LAST);
      setDoneMap({});
      alert("Progress reset.");
    };
    resetAllBtn?.addEventListener("click", resetAll);
    return ()=>resetAllBtn?.removeEventListener("click", resetAll);
  },[]);

  /* Shortcut Ctrl/⌘ + Enter */
  useEffect(()=>{
    function onKey(e){
      if((e.ctrlKey || e.metaKey) && e.key === "Enter"){
        e.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[mode, code, activeId]);

  return (
    <div className="container app">
      <div className="shell">
        <Sidebar
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          activeId={activeId}
          setActiveId={setActiveId}
          doneMap={doneMap}
          doneCount={doneCount}
          totalLessons={totalLessons}
          progressPct={progressPct}
        />

        <section className="content">
          <div className="contentHead">
            <div className="crumbs">
              <span className="badge"><span className="dot"></span><strong>{activeLesson.section}</strong></span>
              <span className="badge">{activeLesson.topic}</span>
              <span className="badge">{doneMap[activeId] ? "Completed" : "In progress"}</span>
            </div>

            <div className="titleRow">
              <h1>{activeLesson.title}</h1>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                <button className="btn btnPrimary btnSmall" onClick={run} type="button">Run</button>
                <button className="btn btnSmall" onClick={markDone} type="button">Mark Completed</button>
              </div>
            </div>

            <p className="subText">
              Read the explanation and run the example. Your progress and code are saved locally on this device.
            </p>
          </div>

          <div className="contentBody">
            <div className="grid2">
              <div className="panel">
                <div className="panelHead">
                  <h3>Editor</h3>
                  <span className="hint">Ctrl + Enter to run</span>
                </div>

                <div className="editorTools">
                  <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center"}}>
                    <select className="select" value={mode} onChange={(e)=>setMode(e.target.value)}>
                      <option value="js">JavaScript</option>
                      <option value="html">HTML + JS</option>
                    </select>
                    <span className="hint">Saved on Run</span>
                  </div>

                  <div style={{display:"flex", gap:10}}>
                    <button className="btn btnPrimary btnSmall" onClick={run} type="button">Run</button>
                  </div>
                </div>

                <textarea
                  className="editor"
                  value={code}
                  onChange={(e)=>setCode(e.target.value)}
                  spellCheck="false"
                />
              </div>

              <div className="panel">
                <div className="panelHead">
                  <h3>Output</h3>
                  <span className="hint">Console + Preview</span>
                </div>

                <div className="outWrap">
                  <div className="console" aria-label="Console output">
                    {consoleLines.map((ln, i) => (
                      <div
                        key={i}
                        className={"line " + (ln.level==="dim" ? "dim" : ln.level==="bad" ? "bad" : "")}
                      >
                        {ln.text}
                      </div>
                    ))}
                  </div>

                  <div className="previewBox">
                    <iframe
                      ref={iframeRef}
                      title="Preview"
                      sandbox="allow-scripts allow-forms allow-modals"
                    ></iframe>
                  </div>

                  <div className="hint">
                    HTML lessons render in preview. JS lessons show console output.
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panelHead">
                <h3>Explanation</h3>
                <span className="hint">Concept → example → practice</span>
              </div>

              <div className="outWrap">
                <div className="prose">
                  {activeLesson.explanation.map((p, i) => <p key={i}>{p.text}</p>)}
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
=======
const {useEffect, useMemo, useRef, useState} = React;

/* localStorage keys */
const LS = {
  DONE: "jsacademy_done_v2",
  CODE: "jsacademy_code_v2",
  LAST: "jsacademy_last_v2"
};

function readLS(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}
function writeLS(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/* Lesson helpers (NO quizzes, NO challenges) */
function lesson(id, title, topic, starterCode, explanation, defaultLang = "js"){
  return { id, title, topic, starterCode, explanation, defaultLang };
}
function explain(lines){ return lines.map(t => ({ text: t })); }

/* Sandbox builder: captures console + errors to parent */
function buildSandboxHTML({ mode, code }) {
  const consolePatch = `
    (function(){
      function send(type, payload){
        parent.postMessage({ __JSACADEMY__: true, type, payload }, "*");
      }
      const orig = {};
      ["log","info","warn","error"].forEach((k) => {
        orig[k] = console[k];
        console[k] = function(...args){
          try{
            send("console", {
              level: k,
              args: args.map((a) => {
                try{
                  if(typeof a === "string") return a;
                  return JSON.stringify(a, null, 2);
                }catch{
                  return String(a);
                }
              })
            });
          }catch(_e){}
          orig[k].apply(console, args);
        };
      });

      window.addEventListener("error", (e) => {
        send("error", { message: e.message });
      });

      window.addEventListener("unhandledrejection", (e) => {
        send("error", { message: (e.reason && e.reason.message) ? e.reason.message : String(e.reason) });
      });

      send("ready", { ok:true });
    })();
  `;

  if (mode === "html") {
    // allow full HTML examples
    return `
${code}
<script>${consolePatch}<\/script>
`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body{font-family:system-ui;padding:14px}
    .hint{opacity:.7;font-size:13px}
    code{background:#f6f6f7;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="hint">Sandbox running JavaScript…</div>
  <script>${consolePatch}<\/script>
  <script>
    try {
${code}
    } catch(e) {
      console.error("Runtime error:", e && e.message ? e.message : e);
    }
  <\/script>
</body>
</html>`;
}

/* A few HTML+JS lessons need full HTML starter code */
function htmlLessonTemplate(title, bodyInner, scriptInner){
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui;padding:16px}
    .card{max-width:820px;margin:0 auto;border:1px solid #ddd;border-radius:16px;padding:16px}
    button,input,textarea,select{padding:10px 12px;border-radius:12px;border:1px solid #ddd;background:#fff}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .muted{opacity:.7}
    .box{border:1px solid #ddd;border-radius:14px;padding:12px;margin-top:10px}
    .danger{border-color:#ff4d6d}
    code{background:#f6f6f7;padding:2px 6px;border-radius:8px}
    a{color:inherit}
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    ${bodyInner}
    <p class="muted">Tip: You can still see logs in the platform console.</p>
  </div>

  <script>
${scriptInner}
  <\/script>
</body>
</html>`;
}

/* Module lesson template: runnable import/export using Blob URLs */
function moduleLessonTemplate(title, moduleA, moduleB){
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui;padding:16px}
    .card{max-width:820px;margin:0 auto;border:1px solid #ddd;border-radius:16px;padding:16px}
    pre{background:#0b1020;color:#fff;padding:12px;border-radius:12px;overflow:auto}
    .muted{opacity:.7}
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    <p class="muted">This uses real ES modules via dynamic <code>import()</code> + Blob URLs.</p>
    <div id="out" class="muted"></div>
    <h4>Module A</h4>
    <pre>${escapeHtml(moduleA)}</pre>
    <h4>Module B</h4>
    <pre>${escapeHtml(moduleB)}</pre>
  </div>

  <script type="module">
    const out = document.getElementById("out");

    const codeA = ${JSON.stringify(moduleA)};
    const codeB = ${JSON.stringify(moduleB)};

    const blobA = new Blob([codeA], { type: "text/javascript" });
    const urlA = URL.createObjectURL(blobA);

    // module B can import A by placeholder then replace at runtime
    const finalB = codeB.replace("__MODULE_A_URL__", urlA);
    const blobB = new Blob([finalB], { type: "text/javascript" });
    const urlB = URL.createObjectURL(blobB);

    try{
      const mod = await import(urlB);
      out.textContent = "Loaded. Check the console for module output.";
      console.log("Module B exports:", mod);
    }catch(e){
      out.textContent = "Module load error: " + (e.message || e);
      console.error(e);
    }
  <\/script>
</body>
</html>`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================
   FULL CURRICULUM (NO QUIZZES)
   Covers: ALL items you listed
   ========================= */
const CURRICULUM = [

  /* =========================
     1) BASICS
     ========================= */
  {
    level: "Basics — Variables",
    lessons: [
      lesson("b_var_letconst","let vs const","Basics",
`let name = "Aisha";
const city = "Doha";

name = "Omar"; // allowed
// city = "Paris"; // not allowed (const)

console.log(name, "from", city);`,
explain([
"Use **const** by default. It prevents accidental re-assignment.",
"Use **let** when the variable must be reassigned (counters, changing values).",
"Rule: const = safer default."
])),
      lesson("b_var_var","var (function scope)","Basics",
`function demo(){
  var x = 1;
  if(true){
    var x = 2; // SAME variable
  }
  console.log("x:", x); // 2
}
demo();`,
explain([
"**var** is function-scoped (not block-scoped).",
"That means var inside if/for can leak within the function.",
"Modern JS prefers **let/const** to avoid this confusion."
])),
      lesson("b_var_hoist","Hoisting & TDZ (concept)","Basics",
`// Hoisting concept (don't rely on it)
console.log("Declare variables before using them.");

// let/const have TDZ (Temporal Dead Zone):
// console.log(a); // ReferenceError
// let a = 10;`,
explain([
"JavaScript processes declarations before running code (hoisting concept).",
"**let/const** exist in a **Temporal Dead Zone** until initialized.",
"Practical rule: always declare before you use."
])),
    ]
  },

  {
    level: "Basics — Data Types",
    lessons: [
      lesson("b_types_primitives","Primitive types","Basics",
`const s = "text";
const n = 42;
const b = true;
const u = undefined;
const z = null;
console.log(typeof s, typeof n, typeof b, typeof u, z);`,
explain([
"Primitive types: **string, number, boolean, null, undefined, bigint, symbol**.",
"Objects: arrays, functions, plain objects, dates, etc.",
"Knowing types helps you avoid bugs and choose correct methods."
])),
      lesson("b_types_symbol","Symbol (unique keys)","Basics",
`const id1 = Symbol("id");
const id2 = Symbol("id");

console.log(id1 === id2); // false (unique)

const user = { name: "Noor" };
user[id1] = 12345;

console.log("normal keys:", Object.keys(user)); // ["name"]
console.log("symbol value:", user[id1]);`,
explain([
"**Symbol** creates unique identifiers (even with the same description).",
"Symbols are often used as hidden/unique object keys.",
"Most beginners don't need Symbol daily, but it matters in advanced JS."
])),
      lesson("b_types_bigint","BigInt (large integers)","Basics",
`const a = 9007199254740991;  // max safe integer
const b = 9007199254740991n; // BigInt

console.log("Number:", a);
console.log("BigInt:", b);

// BigInt arithmetic:
console.log(10n + 20n);

// You cannot mix Number and BigInt directly:
// console.log(10n + 1); // TypeError`,
explain([
"Numbers have a maximum safe integer (~9e15).",
"**BigInt** handles very large integers precisely.",
"BigInt uses **n** suffix (example: 10n). Don't mix BigInt + Number without conversion."
])),
      lesson("b_types_truthy","Truthy vs Falsy (important)","Basics",
`const values = [false,true,0,1,"","hi",null,undefined,NaN,[],{}];
values.forEach(v => console.log(v, "=>", Boolean(v)));

console.log("Falsy are: false, 0, '', null, undefined, NaN");`,
explain([
"Falsy values: **false, 0, '', null, undefined, NaN**.",
"Everything else is truthy (including **[]** and **{}**).",
"This affects if/else and logical operators."
])),
      lesson("b_types_coercion","Type coercion & conversion","Basics",
`console.log("5" + 1);     // "51" (string concat)
console.log("5" - 1);     // 4 (number)
console.log(Number("42")); // 42
console.log(String(99));   // "99"

console.log(Boolean(""));  // false
console.log(Boolean("x")); // true`,
explain([
"JavaScript sometimes converts types automatically (coercion).",
"Prefer explicit conversions: **Number(), String(), Boolean()**.",
"Use **===** strict equality to avoid confusing coercion bugs."
])),
    ]
  },

  {
    level: "Basics — Operators",
    lessons: [
      lesson("b_ops_arith","Arithmetic operators","Basics",
`console.log(10 + 5);
console.log(10 - 5);
console.log(10 * 5);
console.log(10 / 5);
console.log(10 % 3); // remainder
console.log(2 ** 5); // power`,
explain([
"Arithmetic operators: **+ - * / % **.",
"% is remainder (useful for even/odd checks).",
"** is power."
])),
      lesson("b_ops_compare","Comparison & equality","Basics",
`console.log(5 == "5");   // true (coercion)
console.log(5 === "5");  // false (strict)
console.log(5 != "5");   // false (coercion)
console.log(5 !== "5");  // true (strict)

console.log(10 >= 10);
console.log(3 < 8);`,
explain([
"Prefer strict checks: **===** and **!==**.",
"== and != can surprise you due to coercion.",
"Comparisons return booleans (true/false)."
])),
      lesson("b_ops_logical","Logical operators: && || !","Basics",
`const a = true;
const b = false;

console.log(a && b); // false
console.log(a || b); // true
console.log(!a);     // false`,
explain([
"&& means 'AND' (both must be true).",
"|| means 'OR' (one true is enough).",
"! flips boolean."
])),
      lesson("b_ops_optional_nullish","Optional chaining & nullish (?. ??)","Basics",
`const user = { profile: { name: "Noor" } };

console.log(user?.profile?.name);       // "Noor"
console.log(user?.settings?.theme);     // undefined (no crash)

console.log(null ?? "fallback");        // "fallback"
console.log(undefined ?? "fallback");   // "fallback"
console.log(false ?? "fallback");       // false (NOT fallback)
console.log(false || "fallback");       // "fallback"`,
explain([
"**?.** prevents errors when properties might be missing.",
"**??** uses fallback only when value is **null/undefined**.",
"|| uses fallback for any falsy value (false, 0, '')."
])),
    ]
  },

  /* =========================
     2) CONTROL FLOW
     ========================= */
  {
    level: "Control Flow — Conditionals",
    lessons: [
      lesson("cf_ifelse","if / else / else if","Control Flow",
`const temp = 31;

if (temp < 18) console.log("Cold");
else if (temp < 28) console.log("Warm");
else console.log("Hot");`,
explain([
"if chooses a path based on a condition.",
"else if allows multiple ranges / conditions.",
"Keep conditions readable: store complex checks in variables."
])),
      lesson("cf_switch","switch","Control Flow",
`const day = "Friday";

switch(day){
  case "Monday":
    console.log("Start of week");
    break;
  case "Friday":
    console.log("Weekend soon");
    break;
  default:
    console.log("Other day");
}`,
explain([
"switch is good for many exact matches.",
"Remember **break** to avoid falling through cases.",
"default runs if no case matches."
])),
    ]
  },

  {
    level: "Control Flow — Loops",
    lessons: [
      lesson("lp_for","for loop","Loops",
`for(let i=1;i<=5;i++){
  console.log("i:", i);
}`,
explain([
"for is best when you know how many times you want to loop.",
"Common usage: iterating indexes, counting, building arrays."
])),
      lesson("lp_while","while loop","Loops",
`let n = 3;
while(n > 0){
  console.log("n:", n);
  n--;
}`,
explain([
"while runs while condition is true.",
"Use while when number of iterations is not fixed."
])),
      lesson("lp_dowhile","do…while loop","Loops",
`let tries = 0;
do{
  tries++;
  console.log("Try:", tries);
}while(tries < 3);`,
explain([
"do…while runs **at least once** before checking the condition.",
"Useful when you must execute once then decide if you continue."
])),
      lesson("lp_forof","for…of (arrays/strings)","Loops",
`const arr = ["a","b","c"];
for(const item of arr){
  console.log(item);
}

for(const ch of "JS"){
  console.log("char:", ch);
}`,
explain([
"for…of iterates **values** (arrays, strings, maps, sets).",
"Use it when you need each item directly."
])),
      lesson("lp_forin","for…in (object keys)","Loops",
`const user = { name:"Noor", city:"Doha", role:"student" };

for(const key in user){
  console.log(key, "=>", user[key]);
}`,
explain([
"for…in iterates **keys** of an object.",
"For arrays, prefer for…of or array methods, not for…in."
])),
    ]
  },

  /* =========================
     3) FUNCTIONS + SCOPE + CLOSURES
     ========================= */
  {
    level: "Functions — Core",
    lessons: [
      lesson("fn_decl","Function declaration","Functions",
`function add(a,b){
  return a + b;
}
console.log(add(2,3));`,
explain([
"Function declarations define a named function.",
"Use parameters (inputs) and return (output)."
])),
      lesson("fn_expr","Function expression","Functions",
`const multiply = function(a,b){
  return a * b;
};
console.log(multiply(3,4));`,
explain([
"Function expressions store a function in a variable.",
"Useful for passing functions around or defining conditionally."
])),
      lesson("fn_arrow","Arrow functions","Functions",
`const square = (x) => x * x;
const sum = (a,b) => {
  const s = a + b;
  return s;
};
console.log(square(5));
console.log(sum(2,8));`,
explain([
"Arrow functions are shorter and common in modern JS.",
"Important later: arrows handle **this** differently than normal functions."
])),
      lesson("fn_params_args","Parameters, arguments, default values","Functions",
`function greet(name="friend"){
  console.log("Hello", name);
}
greet();
greet("Aisha");`,
explain([
"Parameters are the variables in function definition.",
"Arguments are the real values you pass when calling.",
"Default values avoid undefined."
])),
      lesson("fn_rest","Rest parameters (...rest)","Functions",
`function total(...nums){
  return nums.reduce((s,n)=>s+n,0);
}
console.log(total(1,2,3,4));`,
explain([
"Rest collects many arguments into an array.",
"Useful for flexible functions and utilities."
])),
      lesson("fn_hof","Higher-order functions (pass functions)","Functions",
`function runTwice(fn){
  fn();
  fn();
}
runTwice(()=>console.log("Hi"));`,
explain([
"A higher-order function takes a function as argument OR returns a function.",
"This is the foundation of callbacks, events, array methods, functional patterns."
])),
      lesson("fn_returning_fn","Functions returning functions","Functions",
`function makeGreeter(prefix){
  return function(name){
    return prefix + " " + name;
  };
}
const hello = makeGreeter("Hello");
console.log(hello("Noor"));`,
explain([
"Functions can return functions (very common in closures).",
"This enables factories: create customized functions."
])),
    ]
  },

  {
    level: "Scope & Closures",
    lessons: [
      lesson("sc_scope","Global vs local scope","Scope",
`let globalX = 10;

function demo(){
  let localY = 5;
  console.log("inside:", globalX, localY);
}
demo();
// console.log(localY); // error`,
explain([
"Global scope: available everywhere (avoid too many globals).",
"Local scope: variables inside functions/blocks.",
"Keep variables close to where they are used."
])),
      lesson("sc_closure_basic","Closures (basic)","Scope",
`function makeCounter(){
  let c = 0;
  return () => ++c;
}
const counter = makeCounter();
console.log(counter(), counter(), counter());`,
explain([
"A closure happens when a function remembers variables from its outer scope.",
"This creates private state (c is private).",
"Closures are one of the most important JS concepts."
])),
      lesson("sc_closure_real","Closures (real use: private config)","Scope",
`function apiClient(baseURL){
  return {
    get(endpoint){
      return baseURL + endpoint;
    }
  };
}
const client = apiClient("https://api.example.com");
console.log(client.get("/users"));`,
explain([
"Closures are used to 'save' configuration (baseURL).",
"This is common in real-world apps and libraries."
])),
    ]
  },

  /* =========================
     4) OBJECTS & ARRAYS
     ========================= */
  {
    level: "Objects — Core",
    lessons: [
      lesson("obj_literals","Object literals & properties","Objects",
`const user = { name:"Noor", city:"Doha" };
console.log(user.name);
user.role = "student";
console.log(user);`,
explain([
"Objects store key/value pairs.",
"You can read, add, and update properties.",
"Objects represent real-world entities and structured data."
])),
      lesson("obj_methods","Methods + this keyword","Objects",
`const person = {
  name: "Omar",
  speak(){
    console.log("Hi, I am", this.name);
  }
};
person.speak();`,
explain([
"Methods are functions inside objects.",
"**this** refers to the object when called as obj.method().",
"this depends on how the function is called."
])),
      lesson("obj_bracket","Key/value access (dot vs bracket)","Objects",
`const user = { name:"Noor", city:"Doha" };

const key = "city";
console.log(user.city);      // dot
console.log(user[key]);      // bracket (dynamic)

user["job-title"] = "Guard"; // only possible with bracket notation
console.log(user);`,
explain([
"Dot notation needs a normal identifier (no spaces, no hyphen).",
"Bracket notation works with dynamic keys and special keys.",
"Use brackets when the key comes from a variable."
])),
      lesson("obj_iterate","Object.keys / values / entries","Objects",
`const user = { name:"Noor", city:"Doha", role:"student" };

console.log(Object.keys(user));
console.log(Object.values(user));
console.log(Object.entries(user));

for (const [k,v] of Object.entries(user)){
  console.log(k, "=>", v);
}`,
explain([
"Object.keys gives array of keys, Object.values gives values, Object.entries gives [key,value].",
"Common for rendering UI lists from object data."
])),
      lesson("obj_destructure","Object destructuring","Objects",
`const user = { name:"Noor", city:"Doha", role:"student" };
const { name, city } = user;
console.log(name, city);`,
explain([
"Destructuring extracts properties into variables quickly.",
"Common in modern JS and React."
])),
    ]
  },

  {
    level: "Arrays — Core + Methods",
    lessons: [
      lesson("arr_create_access","Array creation & access","Arrays",
`const items = ["apple","mango","banana"];
console.log(items[0]);
console.log("length:", items.length);`,
explain([
"Arrays store ordered lists.",
"Access by index (0-based).",
"length tells number of items."
])),
      lesson("arr_push_pop","push & pop (end of array)","Arrays",
`const stack = [];
stack.push("A");
stack.push("B");
stack.push("C");

console.log("stack:", stack);

const last = stack.pop();
console.log("popped:", last);
console.log("after:", stack);`,
explain([
"push adds to the END, pop removes from the END.",
"Very common for stacks and building arrays."
])),
      lesson("arr_shift_unshift","shift & unshift (start of array)","Arrays",
`const q = ["A","B","C"];

q.unshift("FIRST"); // add to start
console.log(q);

const removed = q.shift(); // remove from start
console.log("removed:", removed);
console.log("after:", q);`,
explain([
"unshift adds to START, shift removes from START.",
"Be careful: shift/unshift can be slower for very large arrays."
])),
      lesson("arr_foreach","forEach (loop helper)","Arrays",
`const nums = [1,2,3];
nums.forEach((n, i) => {
  console.log("index", i, "value", n);
});`,
explain([
"forEach runs a function for each item.",
"It does NOT return a new array (use map for that)."
])),
      lesson("arr_map_filter_reduce","map / filter / reduce","Arrays",
`const prices = [10,25,40];

console.log("map x2:", prices.map(p => p * 2));
console.log("filter >=25:", prices.filter(p => p >= 25));
console.log("reduce sum:", prices.reduce((sum,p) => sum + p, 0));`,
explain([
"map transforms into a new array.",
"filter keeps items that match a condition.",
"reduce combines into one value (sum, object, etc.)."
])),
      lesson("arr_find_some_every","find / some / every","Arrays",
`const users = [
  {name:"Noor", age:22},
  {name:"Omar", age:17},
  {name:"Aisha", age:25},
];

console.log("find first adult:", users.find(u => u.age >= 18));
console.log("some under 18?:", users.some(u => u.age < 18));
console.log("every adult?:", users.every(u => u.age >= 18));`,
explain([
"find returns the first matching item (or undefined).",
"some checks if at least one matches.",
"every checks if all match."
])),
      lesson("arr_destructure","Array destructuring","Arrays",
`const arr = [10, 20, 30];
const [a, b] = arr;
console.log(a, b);`,
explain([
"Array destructuring extracts by position (index order).",
"Useful for swapping and reading pairs."
])),
      lesson("arr_spread_rest","Spread & rest with arrays","Arrays",
`const a = [1,2];
const b = [...a, 3,4];
console.log(b);

function sum(...nums){
  return nums.reduce((s,n)=>s+n,0);
}
console.log(sum(1,2,3));`,
explain([
"Spread (...) copies items into a new array.",
"Rest (...) collects parameters into an array.",
"Great for immutability and flexible functions."
])),
      lesson("arr_immutable","Immutable data handling (important)","Arrays",
`const arr = [1,2,3];

// Don't mutate if you want predictable state:
// arr.push(4);

// Instead create new:
const next = [...arr, 4];

console.log("original:", arr);
console.log("new:", next);`,
explain([
"Immutability means you create NEW arrays/objects instead of changing existing ones.",
"This avoids many bugs in UI frameworks (React, etc.)."
])),
    ]
  },

  /* =========================
     5) DOM MANIPULATION
     ========================= */
  {
    level: "DOM Manipulation — Select & Modify",
    lessons: [
      lesson("dom_selectors","Selectors: querySelector / getElementById / getElementsByClassName","DOM",
htmlLessonTemplate(
  "Selecting DOM elements",
  `
  <div class="row">
    <button id="btn1">querySelector</button>
    <button id="btn2">getElementById</button>
    <button id="btn3">getElementsByClassName</button>
  </div>
  <p id="msg" class="box">Message will change here.</p>
  <p class="tag box">Tag A</p>
  <p class="tag box">Tag B</p>
  `,
  `
  const msg = document.querySelector("#msg");

  document.querySelector("#btn1").addEventListener("click", () => {
    const el = document.querySelector(".tag");
    msg.textContent = "querySelector picked: " + el.textContent;
  });

  document.getElementById("btn2").addEventListener("click", () => {
    const el = document.getElementById("msg");
    el.style.borderColor = "#6b5cff";
    el.style.background = "#f8f7ff";
    msg.textContent = "getElementById updated styles + text.";
  });

  document.getElementById("btn3").addEventListener("click", () => {
    const list = document.getElementsByClassName("tag"); // HTMLCollection
    msg.textContent = "getElementsByClassName length: " + list.length;
  });
  `
),
explain([
"DOM = the page structure (elements).",
"querySelector uses CSS selectors and returns the first match.",
"getElementById is fast and direct for #id elements.",
"getElementsByClassName returns a live HTMLCollection (not a real array)."
]),
"html"),

      lesson("dom_modify","Modify: textContent vs innerHTML vs style","DOM",
htmlLessonTemplate(
  "Modifying elements safely",
  `
  <div class="row">
    <input id="name" placeholder="Type a name"/>
    <button id="safe">Safe (textContent)</button>
    <button id="unsafe">Unsafe (innerHTML)</button>
  </div>

  <div id="out" class="box"></div>
  `,
  `
  const out = document.getElementById("out");
  const nameInput = document.getElementById("name");

  document.getElementById("safe").addEventListener("click", () => {
    out.textContent = "Hello " + (nameInput.value || "friend") + "!";
    out.style.borderColor = "#0bb07b";
  });

  document.getElementById("unsafe").addEventListener("click", () => {
    // innerHTML can run injected HTML if user input includes tags
    out.innerHTML = "Hello <strong>" + (nameInput.value || "friend") + "</strong>!";
    out.style.borderColor = "#ff4d6d";
  });
  `
),
explain([
"textContent sets plain text (safe from HTML injection).",
"innerHTML parses HTML (powerful but can be unsafe with user input).",
"style lets you change CSS directly (small changes). For many changes, prefer CSS classes."
]),
"html"),
    ]
  },

  {
    level: "DOM Manipulation — Create & Remove",
    lessons: [
      lesson("dom_create_remove","Create & remove elements dynamically","DOM",
htmlLessonTemplate(
  "Create & remove items",
  `
  <div class="row">
    <input id="item" placeholder="New item"/>
    <button id="add">Add</button>
    <button id="clear">Clear</button>
  </div>
  <ul id="list" class="box"></ul>
  `,
  `
  const list = document.getElementById("list");
  const item = document.getElementById("item");

  function addItem(text){
    const li = document.createElement("li");
    li.textContent = text;

    // remove button
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.style.marginLeft = "10px";
    btn.addEventListener("click", () => li.remove());

    li.appendChild(btn);
    list.appendChild(li);
  }

  document.getElementById("add").addEventListener("click", () => {
    const v = item.value.trim();
    if(!v) return;
    addItem(v);
    item.value = "";
    item.focus();
  });

  document.getElementById("clear").addEventListener("click", () => {
    list.innerHTML = "";
  });
  `
),
explain([
"Create elements using document.createElement().",
"Append using appendChild/append.",
"Remove using element.remove() or clearing parent.innerHTML.",
"This is the foundation of dynamic UI."
]),
"html"),
    ]
  },

  /* =========================
     6) EVENTS
     ========================= */
  {
    level: "Events — Event object, bubbling & capturing",
    lessons: [
      lesson("ev_event_object","Event object (e) + target + preventDefault","Events",
htmlLessonTemplate(
  "Event object basics",
  `
  <form id="form" class="box">
    <div class="row">
      <input id="email" placeholder="Type email"/>
      <button type="submit">Submit</button>
    </div>
    <p class="muted">This form will NOT reload the page because we use preventDefault().</p>
  </form>
  <div id="out" class="box"></div>
  `,
  `
  const form = document.getElementById("form");
  const out = document.getElementById("out");

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // stop page refresh
    const email = document.getElementById("email").value.trim();
    out.textContent = "Submitted email: " + (email || "(empty)");
    console.log("Event type:", e.type);
    console.log("Event target:", e.target.id);
  });
  `
),
explain([
"The event object (often named e) contains details about what happened.",
"e.target is the element that triggered the event.",
"preventDefault() stops default browser action (like form reload)."
]),
"html"),

      lesson("ev_bubble_capture","Event bubbling & capturing (with demo)","Events",
htmlLessonTemplate(
  "Bubbling vs Capturing",
  `
  <div id="outer" class="box">
    Outer
    <div id="inner" class="box">Inner (click me)</div>
  </div>

  <p class="muted">Open console. Capturing fires first, then target, then bubbling.</p>
  `,
  `
  const outer = document.getElementById("outer");
  const inner = document.getElementById("inner");

  // Capturing (true)
  outer.addEventListener("click", () => console.log("OUTER capture"), true);

  // Bubbling (default false)
  outer.addEventListener("click", () => console.log("OUTER bubble"));
  inner.addEventListener("click", (e) => {
    console.log("INNER (target)");
    // e.stopPropagation(); // try this to stop bubbling
  });
  `
),
explain([
"Most events bubble: target → parent → grandparent → ...",
"Capturing is the reverse: top → down to target (use addEventListener(..., true)).",
"stopPropagation() stops the event from continuing up/down."
]),
"html"),

      lesson("ev_inline_vs_listener","Inline events vs addEventListener","Events",
`console.log("Inline events: <button onclick='...'> (avoid in modern apps)");
console.log("Prefer addEventListener: keeps JS separate and cleaner.");
console.log("Inline is harder to maintain, test, and reuse.");`,
explain([
"Inline events mix HTML and JS (harder to maintain).",
"addEventListener keeps logic in JS and supports multiple handlers cleanly.",
"Modern best practice: prefer addEventListener."
])),
    ]
  },

  /* =========================
     7) ADVANCED CONCEPTS
     ========================= */
  {
    level: "Advanced Concepts — this, prototypes, classes",
    lessons: [
      lesson("adv_this_rules","this keyword (common rules)","Advanced",
`const obj = {
  name: "Noor",
  normal(){ console.log("normal this.name:", this.name); },
  arrow: () => console.log("arrow this:", this)
};

obj.normal();
obj.arrow();

const fn = obj.normal;
fn(); // this is undefined in strict mode (or window in old non-strict)`,
explain([
"**this** depends on HOW a function is called.",
"obj.method() -> this = obj.",
"Arrow functions do NOT have their own this; they capture from outer scope.",
"Calling a function directly fn() loses the object context."
])),
      lesson("adv_proto","Prototypes & inheritance (concept)","Advanced",
`function Person(name){
  this.name = name;
}
Person.prototype.greet = function(){
  console.log("Hi", this.name);
};

const p = new Person("Omar");
p.greet();

console.log("Has greet?", p.hasOwnProperty("greet")); // false (from prototype)`,
explain([
"JS inheritance is based on **prototypes**.",
"Methods can live on prototype to be shared across instances.",
"This explains built-in methods like Array.prototype.map."
])),
      lesson("adv_class","class syntax","Advanced",
`class User{
  constructor(name){
    this.name = name;
  }
  greet(){
    console.log("Hello", this.name);
  }
}
const u = new User("Aisha");
u.greet();`,
explain([
"Classes are cleaner syntax over prototypes.",
"constructor runs when you create with new.",
"Methods are shared (like prototype methods)."
])),
      lesson("adv_inheritance","Class inheritance (simple)","Advanced",
`class Animal{
  constructor(name){ this.name = name; }
  speak(){ console.log(this.name, "makes a sound"); }
}
class Dog extends Animal{
  speak(){ console.log(this.name, "barks"); }
}
const d = new Dog("Rex");
d.speak();`,
explain([
"extends creates a prototype chain between classes.",
"Overriding methods allows customizing behavior.",
"Use inheritance carefully (composition is often better)."
])),
    ]
  },

  {
    level: "Advanced Concepts — Error Handling",
    lessons: [
      lesson("err_trycatchfinally","try…catch…finally","Errors",
`try{
  console.log("try start");
  JSON.parse("{bad json}");
}catch(e){
  console.log("caught:", e.message);
}finally{
  console.log("finally always runs");
}`,
explain([
"try: code that may fail.",
"catch: handle error without crashing app.",
"finally: runs whether success or error (cleanup)."
])),
      lesson("err_throw","throw custom errors","Errors",
`function requireEmail(email){
  if(!email) throw new Error("Email is required");
  if(!email.includes("@")) throw new Error("Email must contain @");
  return email;
}

try{
  console.log(requireEmail("test@example.com"));
  console.log(requireEmail("bad"));
}catch(e){
  console.log("Error:", e.message);
}`,
explain([
"Throw when input is invalid or logic must stop.",
"This makes functions predictable.",
"Catch at boundaries (UI, API, main flow)."
])),
    ]
  },

  {
    level: "Advanced Concepts — Modules (import/export)",
    lessons: [
      lesson("mod_import_export","Modules: import/export (real runnable demo)","Modules",
moduleLessonTemplate(
  "ES Modules demo (export + import)",
  `// Module A (math.js)
export function add(a,b){ return a+b; }
export function mul(a,b){ return a*b; }
export const PI = 3.14159;`,
  `// Module B (app.js)
import { add, mul, PI } from "__MODULE_A_URL__";

console.log("add:", add(2,3));
console.log("mul:", mul(3,4));
console.log("PI:", PI);

export const ok = true;`
),
explain([
"Modules let you split code into files using **export** and **import**.",
"In real projects: file A exports functions, file B imports them.",
"Bundlers (Webpack/Vite) package modules for production."
]),
"html"),
      lesson("mod_bundlers","Bundlers: Webpack & Vite (concept)","Modules",
`console.log("Bundlers combine many module files into optimized bundles.");
console.log("Vite = fast dev server + build tool.");
console.log("Webpack = powerful bundler used widely in big projects.");`,
explain([
"Bundlers help browsers load code efficiently (one/few files instead of hundreds).",
"They also support transforms (TypeScript, JSX), minification, tree-shaking.",
"Even if you don’t use backend, understanding bundlers helps you understand real projects."
])),
    ]
  },

  /* =========================
     8) ASYNCHRONOUS JAVASCRIPT
     ========================= */
  {
    level: "Asynchronous JavaScript",
    lessons: [
      lesson("async_callbacks","Callbacks (timers)","Async",
`console.log("Start");
setTimeout(() => console.log("Timer callback"), 300);
console.log("End");`,
explain([
"Callbacks are functions executed later.",
"setTimeout schedules a callback after a delay.",
"Async changes the order of execution."
])),
      lesson("async_promises","Promises","Async",
`function wait(ms){
  return new Promise(res => setTimeout(res, ms));
}
wait(300)
  .then(() => console.log("Promise resolved"))
  .catch(err => console.log("Promise error:", err));`,
explain([
"A Promise represents a future result (resolve/reject).",
"then handles success, catch handles error.",
"Promises avoid deep nested callbacks."
])),
      lesson("async_await","async / await","Async",
`function wait(ms){
  return new Promise(res => setTimeout(res, ms));
}

async function run(){
  console.log("A");
  await wait(250);
  console.log("B");
}
run();`,
explain([
"async/await is clean syntax on top of promises.",
"await pauses inside the async function until the promise resolves.",
"Use try/catch to handle errors with await."
])),
      lesson("async_fetch_get","Fetch API (GET) — real example","Async",
`async function load(){
  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  console.log("status:", res.status);

  const data = await res.json();
  console.log("data:", data);
}
load();`,
explain([
"fetch makes HTTP requests and returns a Promise.",
"res.json() parses JSON response into a JS object.",
"This uses a public demo API (JSONPlaceholder)."
])),
      lesson("async_fetch_post","Fetch API (POST) — sending JSON","Async",
`async function send(){
  const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title:"Hello", body:"World", userId: 1 })
  });

  const data = await res.json();
  console.log("created:", data);
}
send();`,
explain([
"POST sends data to a server.",
"Use headers Content-Type: application/json when sending JSON.",
"Always validate and sanitize on the server in real apps."
])),
    ]
  },

  /* =========================
     9) BROWSER STORAGE
     ========================= */
  {
    level: "Browser Storage — localStorage, sessionStorage, cookies",
    lessons: [
      lesson("store_local","localStorage","Storage",
`localStorage.setItem("demo","hello");
console.log(localStorage.getItem("demo"));
localStorage.removeItem("demo");`,
explain([
"localStorage persists even after browser restart.",
"It stores strings only.",
"Good for settings, small caches, progress tracking."
])),
      lesson("store_session","sessionStorage","Storage",
`sessionStorage.setItem("demo","hi");
console.log(sessionStorage.getItem("demo"));
sessionStorage.removeItem("demo");`,
explain([
"sessionStorage persists only in the current tab session.",
"When the tab closes, it is cleared.",
"Useful for temporary state."
])),
      lesson("store_cookies","Cookies (basic)","Storage",
htmlLessonTemplate(
  "Cookies basics",
  `
  <div class="row">
    <button id="set">Set cookie</button>
    <button id="read">Read cookies</button>
    <button id="clear">Clear cookie</button>
  </div>
  <pre id="out" class="box"></pre>
  `,
  `
  const out = document.getElementById("out");

  document.getElementById("set").addEventListener("click", () => {
    document.cookie = "theme=dark; max-age=3600; path=/";
    out.textContent = "Cookie set: theme=dark";
  });

  document.getElementById("read").addEventListener("click", () => {
    out.textContent = "document.cookie =>\\n" + document.cookie;
  });

  document.getElementById("clear").addEventListener("click", () => {
    // expire it
    document.cookie = "theme=; max-age=0; path=/";
    out.textContent = "Cookie cleared.";
  });
  `
),
explain([
"Cookies are small key/value strings sent to the server automatically (depending on settings).",
"Used for sessions/auth historically.",
"Security flags exist: HttpOnly, Secure, SameSite (server-controlled)."
]),
"html"),
    ]
  },

  /* =========================
     10) ES6+ FEATURES (explicit)
     ========================= */
  {
    level: "ES6+ Features (Modern JS)",
    lessons: [
      lesson("es6_template","Template literals","ES6+",
`const name = "Noor";
const city = "Doha";

console.log("Old:", "Hello " + name + " from " + city);
console.log("Template:", \`Hello \${name} from \${city}\`);`,
explain([
"Template literals use backticks: `...`",
"They support interpolation with ${...}",
"They are cleaner than string concatenation."
])),
      lesson("es6_defaults","Default parameters","ES6+",
`function greet(name="friend"){
  return "Hello " + name;
}
console.log(greet());
console.log(greet("Aisha"));`,
explain([
"Default parameters set a value if argument is undefined.",
"Helps avoid manual checks inside functions."
])),
      lesson("es6_letconst","let & const (modern standard)","ES6+",
`const a = 1;
// a = 2; // error

let b = 1;
b = 2; // ok
console.log(a,b);`,
explain([
"ES6 introduced let and const.",
"Use const by default, let when reassignment is needed."
])),
      lesson("es6_arrow","Arrow functions (modern usage)","ES6+",
`const nums = [1,2,3];
const doubled = nums.map(n => n * 2);
console.log(doubled);`,
explain([
"Arrow functions are concise and perfect for callbacks.",
"Used heavily with array methods and React."
])),
      lesson("es6_modules_repeat","Modules (import/export) recap","ES6+",
`console.log("Modules recap: export from one file, import in another.");
console.log("In this platform, see the Modules section for runnable demo.");`,
explain([
"Modules are ES6+ feature used everywhere in modern JS apps.",
"Bundlers help browsers load modules efficiently."
])),
    ]
  },

  /* =========================
     11) MISC: JSON, REGEX, DATE, MATH
     ========================= */
  {
    level: "Misc — JSON, Regex, Date/Time, Math",
    lessons: [
      lesson("misc_json","JSON parse & stringify","Misc",
`const json = '{"name":"Noor","age":22}';
const obj = JSON.parse(json);
console.log(obj.name, obj.age);

const back = JSON.stringify(obj);
console.log(back);`,
explain([
"JSON is text format for data exchange.",
"JSON.parse converts JSON string -> object.",
"JSON.stringify converts object -> JSON string."
])),
      lesson("misc_regex","Regular expressions (basic)","Misc",
`const text = "Email: test@example.com, Phone: 123-456";
const email = text.match(/[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}/);
console.log("email:", email?.[0]);

const replaced = text.replace(/\\d/g, "X");
console.log("digits replaced:", replaced);`,
explain([
"Regex is pattern matching for strings.",
"match finds patterns, replace can transform text.",
"Use regex carefully: keep patterns readable and tested."
])),
      lesson("misc_date","Date & time basics","Misc",
`const now = new Date();
console.log("ISO:", now.toISOString());
console.log("Year:", now.getFullYear());
console.log("Month (0-11):", now.getMonth());
console.log("Day:", now.getDate());

const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
console.log("3 days later:", future.toDateString());`,
explain([
"Date represents time.",
"toISOString is good for storage.",
"Months are 0-11 (January = 0)."
])),
      lesson("misc_math","Math & number utilities","Misc",
`console.log("random 0-1:", Math.random());
console.log("round:", Math.round(4.6));
console.log("floor:", Math.floor(4.9));
console.log("ceil:", Math.ceil(4.1));
console.log("max:", Math.max(1,9,3));
console.log("min:", Math.min(1,9,3));

const n = 49.995;
console.log("toFixed(2):", n.toFixed(2));`,
explain([
"Math provides utilities for rounding and random numbers.",
"toFixed formats decimals (returns string).",
"Be careful: floating point is not perfect for money (use integer cents or BigInt in some cases)."
])),
    ]
  },

  /* =========================
     EXTRA ADVANCED: MEMORY/PERF, EVENT LOOP, SECURITY, PATTERNS, TESTING, REST
     ========================= */
  {
    level: "Memory & Performance",
    lessons: [
      lesson("perf_dom_batch","Optimize DOM manipulation (batching)","Performance",
htmlLessonTemplate(
  "Batch DOM updates with DocumentFragment",
  `
  <div class="row">
    <button id="slow">Slow add 500</button>
    <button id="fast">Fast add 500</button>
  </div>
  <ul id="list" class="box"></ul>
  <p class="muted">Open console to see timing.</p>
  `,
  `
  const list = document.getElementById("list");

  function clear(){ list.innerHTML = ""; }

  document.getElementById("slow").addEventListener("click", () => {
    clear();
    console.time("slow");
    for(let i=1;i<=500;i++){
      const li = document.createElement("li");
      li.textContent = "Item " + i;
      list.appendChild(li); // many DOM writes
    }
    console.timeEnd("slow");
  });

  document.getElementById("fast").addEventListener("click", () => {
    clear();
    console.time("fast");
    const frag = document.createDocumentFragment();
    for(let i=1;i<=500;i++){
      const li = document.createElement("li");
      li.textContent = "Item " + i;
      frag.appendChild(li); // build off-DOM
    }
    list.appendChild(frag); // single DOM write
    console.timeEnd("fast");
  });
  `
),
explain([
"DOM updates are expensive. Doing many small updates can slow the page.",
"Batch updates using DocumentFragment then append once.",
"This is a real performance pattern used in production."
]),
"html"),

      lesson("perf_leaks","Memory leaks (common causes)","Performance",
`console.log("Common memory leaks:");
console.log("1) Not removing event listeners when elements are removed");
console.log("2) Storing huge arrays/objects globally and never clearing");
console.log("3) Keeping references in closures longer than needed");

console.log("Fix: remove listeners, null references, avoid global caches.");`,
explain([
"Memory leaks happen when references stay alive so garbage collector can’t free memory.",
"Most common in apps: listeners not cleaned up, huge caches, long-lived closures.",
"Practical: clean up intervals, listeners, and references."
])),
      lesson("perf_gc","Garbage collection (concept)","Performance",
`console.log("Garbage collection frees memory for objects that are no longer reachable.");
console.log("If something is still referenced, it won't be collected.");
console.log("Your job: avoid unnecessary references (especially global).");`,
explain([
"JS engine uses garbage collection automatically.",
"Objects are freed when they become unreachable (no references).",
"Leaky code keeps references alive unintentionally."
])),
    ]
  },

  {
    level: "Event Loop & JS Engine",
    lessons: [
      lesson("loop_single_thread","Single-threaded execution (concept)","Event Loop",
`console.log("JavaScript executes on a single main thread.");
console.log("Async tasks are scheduled, then run later when the call stack is free.");`,
explain([
"JavaScript runs single-threaded (one call stack).",
"Async works by scheduling tasks (timers, fetch callbacks) to run later."
])),
      lesson("loop_stack_queue","Call stack, task queue, microtasks (demo)","Event Loop",
`console.log("1) sync start");

setTimeout(()=>console.log("4) macrotask (setTimeout)"), 0);

Promise.resolve().then(()=>console.log("3) microtask (promise)"));

console.log("2) sync end");`,
explain([
"Order: synchronous code first.",
"Then microtasks (Promise callbacks).",
"Then macrotasks (setTimeout, events). This explains async ordering."
])),
      lesson("loop_sync_async","Synchronous vs asynchronous (mental model)","Event Loop",
`console.log("Sync runs now.");
console.log("Async is scheduled to run later.");
console.log("If you block the thread, UI freezes (avoid long loops).");`,
explain([
"Sync: runs immediately, blocks until done.",
"Async: schedules work to happen later without blocking the main thread.",
"Heavy loops freeze UI — split work, batch DOM, or use web workers (advanced)."
])),
    ]
  },

  {
    level: "Security Basics",
    lessons: [
      lesson("sec_xss","XSS (Cross-site scripting) basics","Security",
htmlLessonTemplate(
  "XSS: why innerHTML is risky",
  `
  <div class="row">
    <input id="input" placeholder="Type something (try: <b>bold</b>)" style="flex:1"/>
    <button id="safe">Safe render</button>
    <button id="unsafe">Unsafe render</button>
  </div>
  <div id="out" class="box"></div>
  <p class="muted">This is educational: do not render user input with innerHTML in real apps.</p>
  `,
  `
  const input = document.getElementById("input");
  const out = document.getElementById("out");

  document.getElementById("safe").addEventListener("click", () => {
    out.textContent = input.value; // safe
    out.classList.remove("danger");
  });

  document.getElementById("unsafe").addEventListener("click", () => {
    out.innerHTML = input.value; // risky
    out.classList.add("danger");
  });
  `
),
explain([
"XSS happens when attackers inject scripts into pages.",
"Using innerHTML with untrusted input can allow injection.",
"Safer: textContent, or sanitize/escape on server + client."
]),
"html"),

      lesson("sec_csrf","CSRF basics (concept)","Security",
`console.log("CSRF = tricking a logged-in user to make unwanted requests.");
console.log("Defense: SameSite cookies, CSRF tokens, checking Origin/Referer.");
console.log("Usually handled on the server, but front-end should understand it.");`,
explain([
"CSRF targets authenticated sessions (cookies auto-sent).",
"Best defenses are server-side: SameSite cookies and CSRF tokens.",
"Front-end must send tokens if required."
])),

      lesson("sec_validation","Input validation & escaping (basics)","Security",
`function isValidEmail(email){
  if(typeof email !== "string") return false;
  const e = email.trim();
  return e.includes("@") && e.includes(".");
}

console.log(isValidEmail("test@example.com"));
console.log(isValidEmail("bad"));`,
explain([
"Validate input early (client) for user experience, and always validate on server for security.",
"Escaping means converting special characters so they are treated as text, not HTML/SQL/etc.",
"Never trust user input."
])),
    ]
  },

  {
    level: "Advanced Patterns",
    lessons: [
      lesson("pat_singleton","Singleton pattern","Patterns",
`const Singleton = (function(){
  let instance = null;
  function create(){
    return { createdAt: Date.now() };
  }
  return {
    getInstance(){
      if(!instance) instance = create();
      return instance;
    }
  };
})();

const a = Singleton.getInstance();
const b = Singleton.getInstance();
console.log(a === b, a);`,
explain([
"Singleton ensures only one instance exists.",
"Used for configs, logging services, app-level stores.",
"Use carefully: too many singletons can make code hard to test."
])),
      lesson("pat_observer","Observer pattern (pub/sub)","Patterns",
`function createBus(){
  const listeners = new Map();
  return {
    on(event, fn){
      if(!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    emit(event, payload){
      (listeners.get(event) || []).forEach(fn => fn(payload));
    }
  };
}

const bus = createBus();
bus.on("login", user => console.log("welcome", user));
bus.emit("login", "Noor");`,
explain([
"Observer = subscribers listen for events, publishers emit events.",
"Used in UI frameworks, state management, notifications.",
"This is a clean way to decouple parts of your app."
])),
      lesson("pat_module_pattern","Module pattern (privacy via closures)","Patterns",
`const CounterModule = (function(){
  let c = 0; // private
  return {
    inc(){ c++; },
    get(){ return c; }
  };
})();

CounterModule.inc();
CounterModule.inc();
console.log(CounterModule.get());`,
explain([
"Module pattern uses closures to create private state.",
"This was popular before ES Modules; concept still matters.",
"Same idea appears in factories and encapsulation."
])),
      lesson("pat_fp_pure","Functional concepts: pure functions","Patterns",
`function add(a,b){
  return a + b; // pure: no side effects, same input -> same output
}

let x = 0;
function impure(){
  x++; // side effect
  return x;
}

console.log(add(2,3));
console.log(impure(), impure());`,
explain([
"Pure functions are predictable and easier to test.",
"Avoid hidden side effects when possible.",
"Array methods (map/filter/reduce) fit functional style well."
])),
    ]
  },

  {
    level: "Testing & Debugging",
    lessons: [
      lesson("dbg_console_tools","Console methods beyond log","Debugging",
`const users = [
  {name:"Noor", age:22},
  {name:"Omar", age:17},
];

console.table(users);

console.time("work");
let sum = 0;
for(let i=0;i<100000;i++) sum += i;
console.timeEnd("work");

console.group("Grouped logs");
console.log("A");
console.log("B");
console.groupEnd();`,
explain([
"console.table = great for arrays/objects.",
"console.time/timeEnd = performance timing.",
"console.group makes logs cleaner."
])),
      lesson("dbg_debugger","Debugger (concept)","Debugging",
`console.log("Use Chrome DevTools or VS Code debugger.");
console.log("Add 'debugger;' in code to pause execution when DevTools is open.");

function demo(a,b){
  // debugger; // uncomment in real debugging session
  return a + b;
}
console.log(demo(2,3));`,
explain([
"Debugger lets you pause, step through code, inspect variables.",
"In Chrome DevTools: Sources tab.",
"In VS Code: Run and Debug."
])),
      lesson("dbg_unit_test","Unit testing basics (simple assert)","Debugging",
`function assertEqual(actual, expected, msg){
  if(actual !== expected){
    throw new Error("FAIL: " + msg + " (got " + actual + ", expected " + expected + ")");
  }
  console.log("PASS:", msg);
}

function add(a,b){ return a+b; }

assertEqual(add(2,3), 5, "add should sum numbers");
assertEqual(add(-1,1), 0, "add should handle negatives");`,
explain([
"Unit tests verify small functions behave correctly.",
"In real projects use frameworks like Jest/Vitest, but the mindset is the same.",
"Tests prevent regressions when you change code."
])),
    ]
  },

  {
    level: "APIs & REST + JSON (Deep)",
    lessons: [
      lesson("api_rest_basics","REST basics (concept)","APIs",
`console.log("REST APIs commonly use:");
console.log("GET /items (read)");
console.log("POST /items (create)");
console.log("PUT/PATCH /items/:id (update)");
console.log("DELETE /items/:id (delete)");

console.log("HTTP status examples: 200 OK, 201 Created, 404 Not Found, 500 Server Error");`,
explain([
"REST APIs are standard ways to communicate between front-end and server.",
"Methods: GET/POST/PUT/PATCH/DELETE.",
"Status codes tell success/failure."
])),
      lesson("api_json_deep","Understanding JSON deeply","APIs",
`const obj = {
  name: "Noor",
  age: 22,
  skills: ["js","dom"],
  meta: { active: true }
};

const json = JSON.stringify(obj, null, 2);
console.log(json);

const back = JSON.parse(json);
console.log(back.meta.active);`,
explain([
"JSON supports: objects, arrays, strings, numbers, booleans, null.",
"JSON does NOT support: functions, undefined, Symbol, BigInt (without conversion).",
"Use JSON.stringify(value, null, 2) to pretty-print."
])),
    ]
  },
];

/* UI Components */
function Sidebar({
  query, setQuery, filtered,
  activeId, setActiveId,
  doneMap, doneCount, totalLessons, progressPct
}){
  return (
    <aside className="sidebar">
      <div className="sideHead">
        <h2>Curriculum</h2>
        <div className="search">
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Search lessons (e.g., closure, DOM, async)…"
            aria-label="Search lessons"
          />
        </div>
        <div className="progressRow">
          <span><strong>{doneCount}</strong> / {totalLessons}</span>
          <div className="bar" aria-label="Progress">
            <div style={{width: progressPct + "%"}}></div>
          </div>
          <span style={{minWidth:42, textAlign:"right"}}>{progressPct}%</span>
        </div>
      </div>

      <div className="lessonList" aria-label="Lesson list">
        {filtered.map(sec => (
          <div key={sec.level}>
            <div className="sectionTitle">{sec.level}</div>
            {sec.lessons.map(l => (
              <button
                key={l.id}
                className={"lessonBtn" + (l.id === activeId ? " active" : "")}
                onClick={() => setActiveId(l.id)}
                type="button"
              >
                <div className="lessonTop">
                  <div className="lessonName">{l.title}</div>
                  <span className={"tick" + (doneMap[l.id] ? " done" : "")} aria-hidden="true"></span>
                </div>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  <span className="badge">{l.topic}</span>
                  <span className="badge">{l.defaultLang === "html" ? "HTML + JS" : "JS"}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

function App(){
  const flatLessons = useMemo(() => {
    const arr=[];
    CURRICULUM.forEach(sec => sec.lessons.forEach(l => arr.push({ ...l, section: sec.level })));
    return arr;
  }, []);

  const [doneMap, setDoneMap] = useState(()=>readLS(LS.DONE, {}));
  const [query, setQuery] = useState("");

  const [activeId, setActiveId] = useState(()=>readLS(LS.LAST, flatLessons[0]?.id || "b_var_letconst"));
  const activeLesson = useMemo(()=> flatLessons.find(l=>l.id===activeId) || flatLessons[0], [activeId, flatLessons]);

  const [mode, setMode] = useState("js");
  const [code, setCode] = useState("");
  const [consoleLines, setConsoleLines] = useState([{level:"dim", text:"Console output appears here."}]);

  const iframeRef = useRef(null);

  /* Load lesson + saved code */
  useEffect(()=>{
    const all = readLS(LS.CODE, {});
    const saved = all[activeId];
    const l = flatLessons.find(x => x.id === activeId) || flatLessons[0];

    setMode(saved?.lang || l.defaultLang || "js");
    setCode(saved?.code || l.starterCode || "");
    setConsoleLines([{level:"dim", text:"Console output appears here."}]);

    writeLS(LS.LAST, activeId);
  },[activeId, flatLessons]);

  /* Listen for iframe console */
  useEffect(()=>{
    function onMsg(e){
      const d = e.data;
      if(!d || !d.__JSACADEMY__) return;

      if(d.type==="console"){
        const level = d.payload.level;
        const text = (d.payload.args || []).join(" ");
        setConsoleLines(prev => {
          const next = prev.filter(x=>x.level!=="dim");
          next.push({level, text});
          return next.slice(-250);
        });
      }
      if(d.type==="error"){
        setConsoleLines(prev => {
          const next = prev.filter(x=>x.level!=="dim");
          next.push({level:"bad", text:"Error: " + (d.payload.message || "Unknown error")});
          return next.slice(-250);
        });
      }
    }
    window.addEventListener("message", onMsg);
    return ()=>window.removeEventListener("message", onMsg);
  },[]);

  const totalLessons = flatLessons.length;
  const doneCount = useMemo(()=>Object.values(doneMap).filter(Boolean).length, [doneMap]);
  const progressPct = totalLessons ? Math.round((doneCount/totalLessons)*100) : 0;

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if(!q) return CURRICULUM;
    return CURRICULUM.map(sec => ({
      ...sec,
      lessons: sec.lessons.filter(l => {
        const hay = `${sec.level} ${l.title} ${l.topic}`.toLowerCase();
        return hay.includes(q);
      })
    })).filter(sec => sec.lessons.length);
  },[query]);

  function saveCode(){
    const all = readLS(LS.CODE, {});
    all[activeId] = { lang: mode, code };
    writeLS(LS.CODE, all);
  }

  function run(){
    saveCode();
    setConsoleLines([{level:"dim", text:"Running…"}]);
    const html = buildSandboxHTML({mode, code});
    iframeRef.current.srcdoc = html;
  }

  function markDone(){
    const next = {...doneMap, [activeId]: true};
    setDoneMap(next);
    writeLS(LS.DONE, next);
  }

  /* Reset all button */
  useEffect(()=>{
    const resetAllBtn = document.getElementById("resetAllBtn");
    const resetAll = ()=>{
      if(!confirm("Reset all progress and saved code?")) return;
      localStorage.removeItem(LS.DONE);
      localStorage.removeItem(LS.CODE);
      localStorage.removeItem(LS.LAST);
      setDoneMap({});
      alert("Progress reset.");
    };
    resetAllBtn?.addEventListener("click", resetAll);
    return ()=>resetAllBtn?.removeEventListener("click", resetAll);
  },[]);

  /* Shortcut Ctrl/⌘ + Enter */
  useEffect(()=>{
    function onKey(e){
      if((e.ctrlKey || e.metaKey) && e.key === "Enter"){
        e.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[mode, code, activeId]);

  return (
    <div className="container app">
      <div className="shell">
        <Sidebar
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          activeId={activeId}
          setActiveId={setActiveId}
          doneMap={doneMap}
          doneCount={doneCount}
          totalLessons={totalLessons}
          progressPct={progressPct}
        />

        <section className="content">
          <div className="contentHead">
            <div className="crumbs">
              <span className="badge"><span className="dot"></span><strong>{activeLesson.section}</strong></span>
              <span className="badge">{activeLesson.topic}</span>
              <span className="badge">{doneMap[activeId] ? "Completed" : "In progress"}</span>
            </div>

            <div className="titleRow">
              <h1>{activeLesson.title}</h1>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                <button className="btn btnPrimary btnSmall" onClick={run} type="button">Run</button>
                <button className="btn btnSmall" onClick={markDone} type="button">Mark Completed</button>
              </div>
            </div>

            <p className="subText">
              Read the explanation and run the example. Your progress and code are saved locally on this device.
            </p>
          </div>

          <div className="contentBody">
            <div className="grid2">
              <div className="panel">
                <div className="panelHead">
                  <h3>Editor</h3>
                  <span className="hint">Ctrl + Enter to run</span>
                </div>

                <div className="editorTools">
                  <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center"}}>
                    <select className="select" value={mode} onChange={(e)=>setMode(e.target.value)}>
                      <option value="js">JavaScript</option>
                      <option value="html">HTML + JS</option>
                    </select>
                    <span className="hint">Saved on Run</span>
                  </div>

                  <div style={{display:"flex", gap:10}}>
                    <button className="btn btnPrimary btnSmall" onClick={run} type="button">Run</button>
                  </div>
                </div>

                <textarea
                  className="editor"
                  value={code}
                  onChange={(e)=>setCode(e.target.value)}
                  spellCheck="false"
                />
              </div>

              <div className="panel">
                <div className="panelHead">
                  <h3>Output</h3>
                  <span className="hint">Console + Preview</span>
                </div>

                <div className="outWrap">
                  <div className="console" aria-label="Console output">
                    {consoleLines.map((ln, i) => (
                      <div
                        key={i}
                        className={"line " + (ln.level==="dim" ? "dim" : ln.level==="bad" ? "bad" : "")}
                      >
                        {ln.text}
                      </div>
                    ))}
                  </div>

                  <div className="previewBox">
                    <iframe
                      ref={iframeRef}
                      title="Preview"
                      sandbox="allow-scripts allow-forms allow-modals"
                    ></iframe>
                  </div>

                  <div className="hint">
                    HTML lessons render in preview. JS lessons show console output.
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panelHead">
                <h3>Explanation</h3>
                <span className="hint">Concept → example → practice</span>
              </div>

              <div className="outWrap">
                <div className="prose">
                  {activeLesson.explanation.map((p, i) => <p key={i}>{p.text}</p>)}
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
>>>>>>> 450cd334fa1c4f284ba75d0af9bad7ef9d61df54
