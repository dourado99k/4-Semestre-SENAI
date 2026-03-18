let variavel = [];

export function functionTeste(params){

if(!variavel.length){
    console.log(variavel)
    variavel.push("Piu-Piu")
    console.log(variavel)
    variavel.unshift("Frajola")
    console.log(variavel)

}
variavel.push("Tom")

variavel.push("Patolino")
console.log(variavel)
if (variavel.length > 2) {
  variavel.push(variavel.shift());
    console.log(variavel)
}
let todosTemLetraRepetida = true;

for (let i = 0; i < variavel.length; i++) {
  const nome = variavel[i].replace("-", "").toLowerCase();
  let temRepetida = false;

  for (let j = 0; j < nome.length; j++) {
    for (let k = j + 1; k < nome.length; k++) {
      if (nome[j] === nome[k]) {
        temRepetida = true;
        break;
      }
    }
    if (temRepetida) break;
  }

  if (!temRepetida) {
    todosTemLetraRepetida = false;
    break;
  }
}

console.log(todosTemLetraRepetida);

// 2) filtrar quem não é gato nem ave
const especies = {
  frajola: "gato",
  "piu-piu": "ave",
  tom: "gato",
  patolino: "pato",
};

let filtrados = [];

for (let i = 0; i < variavel.length; i++) {
  const especie = especies[variavel[i].toLowerCase()];
  if (especie !== "gato" && especie !== "ave") {
    filtrados.push(variavel[i]);
  }
}

console.log(filtrados);
}
functionTeste()