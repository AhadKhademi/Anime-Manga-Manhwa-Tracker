const body = document.body;
const header = document.querySelector("header");
const openMenuBtn = document.getElementById("menu-btn");
const closeMenuBtn = document.querySelector(".close-menu-btn");

//form, input, select
const form = document.getElementById("input-container");
const addInput = document.getElementById("add-input");
const typeSelector = document.getElementById("type-selector");

//sort UI buttons
const allBtn = document.getElementById("all-btn");
const animeBtn = document.getElementById("anime-btn");
const mangaBtn = document.getElementById("manga-btn");
const manhwaBtn = document.getElementById("manhwa-btn");
const updatedBtn = document.getElementById("updated-btn");
const allSortBtns = document.querySelectorAll(".sort-btn");

body.style.paddingTop = header.offsetHeight + "px";

let LIST = JSON.parse(localStorage.getItem("AnimeMangaManhwa")) || [];

allBtn.addEventListener("click", () => sortBtns(allBtn, allSortBtns));
animeBtn.addEventListener("click", () => sortBtns(animeBtn, allSortBtns));
mangaBtn.addEventListener("click", () => sortBtns(mangaBtn, allSortBtns));
manhwaBtn.addEventListener("click", () => sortBtns(manhwaBtn, allSortBtns));
updatedBtn.addEventListener("click", () => sortBtns(updatedBtn, allSortBtns));

openMenuBtn.addEventListener("click", openCloseMenu);
closeMenuBtn.addEventListener("click", openCloseMenu);
form.addEventListener("submit", addNewCard);

function sortBtns(sortBtn, otherBtns){
    let sortBtnId = "";
    let myList = LIST;
    let message = "";

    otherBtns.forEach((btn) => {
        if(btn !== sortBtn){
            btn.classList.remove("btn-active");
        } 
        else{
            btn.classList.add("btn-active");
            sortBtnId = btn.id;
        } 
    })

    if(sortBtnId === "all-btn"){
        message = "Nothing here yet";
    }
    else if(sortBtnId === "anime-btn"){
        myList = myList.filter(card => card.type == "Anime");
        message = "No anime yet";
    }
    else if(sortBtnId === "manga-btn"){
        myList = myList.filter(card => card.type == "Manga")
        message = "No manga yet";
    }
    else if(sortBtnId === "manhwa-btn"){
        myList = myList.filter(card => card.type == "Manhwa")
        message = "No manhwa yet";
    }
    else if(sortBtnId === "updated-btn"){
        myList = [];
        message = "Under construction";
    }

    updateUI(myList, message);
}

async function addNewCard(e){
    e.preventDefault();

    const cardTitle = addInput.value.trim();
    const cardType = typeSelector.value.trim();

    let newCard = await findTheCard(cardTitle, cardType);

    if(newCard != null){
        LIST.push(newCard);
        localStorage.setItem("AnimeMangaManhwa", JSON.stringify(LIST));
    }
    else{
        window.alert("Couldn't find it try again");
        return
    }

    updateUI(LIST);
    clearInput();
}

async function findTheCard(title, type){
    let cardTitle = title;
    let cardType = type;

    const query = `
        query ($search: String, $type: MediaType){
            Media(search: $search, type: $type){
                title{
                    romaji
                    english
                    native
                }
                status
                averageScore
                episodes
                chapters
                volumes
                coverImage{
                    large
                }
                nextAiringEpisode{
                    episode
                    timeUntilAiring
                }
                externalLinks{
                    site
                    url
                }
                countryOfOrigin
            }
        }
    `

    const variables = {
        search: cardTitle,
        type: cardType
    }

    try{
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables })
        });

        const {data} = await response.json();
        const cardInfo = data.Media;

        if(!cardInfo) return null;

        console.log(cardInfo);

        let newCard = {};


        if(cardType === "MANGA"){
            newCard = {
                id : Date.now(),
                title : cardInfo.title.english,
                type : cardInfo.countryOfOrigin === "KR" ? "Manhwa" : cardInfo.countryOfOrigin === "CN" ? "Manhua" : "Manga",
                status : cardInfo.status,
                score : cardInfo.averageScore ? cardInfo.averageScore / 10 : null,
                chapters: cardInfo.chapters,
                volumes: cardInfo.volumes,
                img: cardInfo.coverImage.large
            }
        }
        else{
            newCard = {
                id : Date.now(),
                title : cardInfo.title.english || cardInfo.title.romaji,
                type : "Anime",
                status : cardInfo.status,
                score : cardInfo.averageScore ? cardInfo.averageScore / 10 : null,
                episodes : cardInfo.episodes,
                nextEpisode : cardInfo.nextAiringEpisode?.episode ?? null,
                img: cardInfo.coverImage.large
            }
        }
        
        return newCard;
    }
    catch(error) {
        console.log(error.message);
    }
}

function updateUI(list, message){
    let contentContainer = document.querySelector(".content-container");
    contentContainer.innerHTML = "";

    let sortedList = [...list].reverse();

    if(sortedList.length == 0){
        contentContainer.innerHTML = `
            <h1 style="color: white; margin-top: 50px">${message}</h1>
        `
    }
    else{
        sortedList.forEach((card) => {
            let newCard = makeCard(card);
            contentContainer.appendChild(newCard);
        })
    }
}

function makeCard(card){
    let newCard = document.createElement("div");
    newCard.classList.add("card");
    newCard.id = card.id;

    if(card.type === "Anime"){
        newCard.innerHTML = `
            <div class="card-img-wrapper">
                <img class="card-img" src="${card.img}" alt="image">
            </div>
            <small class="age absolute">${card.type}</small>
            <small class="season-episode absolute">EP${card.episodes}</small>
            <span class="rating-container absolute">
                <div class="logo-container">
                    <img class="logo-img" src="logo/MyAnimeList_Logo.png">
                </div>
                <small class="rating">${card.score}</small>
            </span>
            <small class="airing absolute">${card.status}</small>
            <span class="absolute delete"><i class="fa-solid fa-xmark"></i></span>

            <div class="title-container">
                <span class="card-title">${card.title}</span>
            </div>
        `
    }
    else{
        newCard.innerHTML = `
            <div class="card-img-wrapper">
                <img class="card-img" src="${card.img}" alt="image">
            </div>
            <small class="age absolute">${card.type}</small>
            <small class="season-episode absolute">V${card.volumes} CH${card.chapters}</small>
            <span class="rating-container absolute">
                <div class="logo-container">
                    <img class="logo-img" src="logo/MyAnimeList_Logo.png">
                </div>
                <small class="rating">${card.score}</small>
            </span>
            <small class="airing absolute">${card.status}</small>
            <span class="absolute delete"><i class="fa-solid fa-xmark"></i></span>

            <div class="title-container">
                <span class="card-title">${card.title}</span>
            </div>
        `
    }

    newCard.querySelector(".delete").addEventListener("click", deleteCard);

    return newCard;
}

function deleteCard(e){
    let deleteThisElement = e.target.closest(".card");
    LIST = LIST.filter(card => card.id != deleteThisElement.id);
    localStorage.setItem("AnimeMangaManhwa", JSON.stringify(LIST));

    updateUI(LIST, "Nothing here yet");
}

function openCloseMenu(){
    const sideMenu = document.querySelector(".side-menu");
    sideMenu.classList.toggle("active");
}

function clearInput(){
    addInput.value = "";
}

window.addEventListener("DOMContentLoaded", updateUI(LIST, "Nothing here yet"));