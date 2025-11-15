const body = document.body;
const header = document.querySelector("header");
const openMenuBtn = document.getElementById("menu-btn");
const closeMenuBtn = document.querySelector(".close-menu-btn");
const contentContainer = document.querySelector(".content-container");

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

//pagination elements
const prePageBtn = document.getElementById("pre-page-btn");
const pageNumberDisplayer = document.getElementById("page-number");
const nextPageBtn = document.getElementById("next-page-btn");
const paginationContainer = document.querySelector(".pagination-container");

body.style.paddingTop = header.offsetHeight + "px";

let LIST = JSON.parse(localStorage.getItem("AnimeMangaManhwa")) || [];

let latestList = [];

//pagination info
let page = 1;
let pageSize = 6;
let totalPages = Math.ceil(LIST.length / pageSize);

let checkSectionId = allBtn.id;

let isSubmitting = false;

allBtn.addEventListener("click", () => sortBtns(allBtn, allSortBtns));
animeBtn.addEventListener("click", () => sortBtns(animeBtn, allSortBtns));
mangaBtn.addEventListener("click", () => sortBtns(mangaBtn, allSortBtns));
manhwaBtn.addEventListener("click", () => sortBtns(manhwaBtn, allSortBtns));
updatedBtn.addEventListener("click", () => sortBtns(updatedBtn, allSortBtns));

openMenuBtn.addEventListener("click", openCloseMenu);
closeMenuBtn.addEventListener("click", openCloseMenu);
form.addEventListener("submit", addNewCard);

// updatePageSize()
function updatePageSize(){
    if(window.innerWidth >= 1200) pageSize = 18;
    else if(window.innerWidth >= 1100) pageSize = 16;
    else if(window.innerWidth >= 1000) pageSize = 15;
    else if(window.innerWidth >= 700) pageSize = 12;
    else if(window.innerWidth >= 500) pageSize = 10;
    else pageSize = 6;
}

updatePageSize();

let resizeTimeout;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        updatePageSize();

        let rightList = giveTheRightList(checkSectionId);
        updateUI(rightList.list, rightList.message);
    }, 300)
})

prePageBtn.addEventListener("click", () => {
    if(page > 1) page--;
    else return;

    updateUI(latestList, "Nothing here");
})

nextPageBtn.addEventListener("click", () => {
    if(page < totalPages) page++
    else return;

    updateUI(latestList, "Nothing here");
})

// sortBtns()
function sortBtns(sortBtn, otherBtns){
    page = 1;

    otherBtns.forEach((btn) => {
        if(btn !== sortBtn){
            btn.classList.remove("btn-active");
        } 
        else{
            btn.classList.add("btn-active");
            checkSectionId = btn.id;
        } 
    })

    let rightList = giveTheRightList(checkSectionId);

    updateUI(rightList.list, rightList.message);
}

// addNewCard()
async function addNewCard(e){
    e.preventDefault();

    if(isSubmitting) return;
    isSubmitting = true;

    const cardTitle = addInput.value.trim();
    const cardType = typeSelector.value.trim();

    let newCard = await findTheCard(cardTitle, cardType);

    if(newCard != null){
        for(let card of LIST){
            if(card.title === newCard.title && card.type === newCard.type){
                showToast(card.title, "exist");
                isSubmitting = false;
                return;
            }
        }

        LIST.push(newCard);
        localStorage.setItem("AnimeMangaManhwa", JSON.stringify(LIST));
        showToast("Successfully added", "successfulAdd");
    }
    else{
        showToast("Couldn't find it", "notFound");
        isSubmitting = false;
        return;
    }

    let rightList = giveTheRightList(checkSectionId);

    updateUI(rightList.list, rightList.message);
    clearInput();

    isSubmitting = false;
}

// findTheCard
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
    `;

    const variables = {
        search: cardTitle,
        type: cardType
    };

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
                title : cardInfo.title.english || `USER - ${cardTitle}`,
                type : cardInfo.countryOfOrigin === "KR" ? "Manhwa" : cardInfo.countryOfOrigin === "CN" ? "Manhua" : "Manga",
                status : cardInfo.status,
                score : cardInfo.averageScore ? cardInfo.averageScore / 10 : null,
                chapters: cardInfo.chapters,
                volumes: cardInfo.volumes,
                img: cardInfo.coverImage.large
            };
        }
        else{
            newCard = {
                id : Date.now(),
                title : cardInfo.title.english || cardInfo.title.romaji || `user : ${cardTitle}`,
                type : "Anime",
                status : cardInfo.status,
                score : cardInfo.averageScore ? cardInfo.averageScore / 10 : null,
                episodes : cardInfo.episodes,
                nextEpisode : cardInfo.nextAiringEpisode?.episode ?? null,
                img: cardInfo.coverImage.large
            };
        }
        
        return newCard;
    }
    catch(error) {
        console.log(error.message);
    }
}

// updateUI()
function updateUI(list, message){
    let contentContainer = document.querySelector(".content-container");
    contentContainer.innerHTML = "";

    latestList = list;

    totalPages = Math.ceil(list.length / pageSize);

    paginationContainer.style.display = totalPages === 0 ? "none" : "flex";

    if(page > totalPages) page = totalPages || 1;

    const start = (page - 1) * pageSize;

    let reversed = [...list].reverse();

    let sortedList = reversed.slice(start, start + pageSize);

    if(sortedList.length == 0){
        contentContainer.innerHTML = `
            <h1 style="color: white; margin-top: 50px">${message}</h1>
        `;

        contentContainer.style.display = "flex";
        contentContainer.style.justifyContent = "center";
    }
    else{
        contentContainer.style.display = "grid";
        contentContainer.style.gridTemplateColumns = "repeat(auto-fill, minmax(150px, 1fr))";

        sortedList.forEach((card) => {
            let newCard = makeCard(card);
            contentContainer.appendChild(newCard);
        });
    }

    pageNumberDisplayer.textContent = `${page} of ${totalPages}`;

    updatePaginationButtons();
}

// makeCard()
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
        `;
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
        `;
    }

    newCard.querySelector(".delete").addEventListener("click", deleteCard);

    return newCard;
}

// deleteCard()
function deleteCard(e){
    let deleteThisElement = e.target.closest(".card");
    LIST = LIST.filter(card => card.id != deleteThisElement.id);
    localStorage.setItem("AnimeMangaManhwa", JSON.stringify(LIST));

    let rightList = giveTheRightList(checkSectionId);

    updateUI(rightList.list, rightList.message);
}

// giveTheRightList()
function giveTheRightList(sectionId){
    let filteredList = [];
    let message = "";

    switch(sectionId){
        case "all-btn":
            filteredList = LIST;
            message = "Nothing here";
            break;

        case "anime-btn":
            filteredList = LIST.filter(card => card.type === "Anime");
            message = "No Anime yet";
            break;

        case "manga-btn":
            filteredList = LIST.filter(card => card.type === "Manga");
            message = "No Manga yet";
            break;

        case "manhwa-btn":
            filteredList = LIST.filter(card => card.type === "Manhwa");
            message = "No Manhwa yet";
            break;

        case "updated-btn":
            filteredList = [];
            message = "Under construction";
            break;

        default:
            filteredList = LIST;
            message = "Nothing here";
            break;
    }
    
    return {
        list : filteredList,
        message : message
    };
}

// updatePaginationButtons()
function updatePaginationButtons(){
    prePageBtn.style.opacity = page === 1 ? "0.5" : "1";
    prePageBtn.style.pointerEvents = page === 1 ? "none" : "auto";
    nextPageBtn.style.opacity = page === totalPages ? "0.5" : "1";
    nextPageBtn.style.pointerEvents = page === totalPages ? "none" : "auto";
}

//showToast()
function showToast(message, type){
    const oldToast = document.querySelector(".toast");
    if(oldToast) oldToast.remove();

    toastElement = document.createElement("div");
    toastElement.classList.add("toast");

    switch(type){
        case "exist":
            toastElement.classList.add("exist-toast-border");

            toastElement.innerHTML = `
                <div class="icon-holder exist-toast-icon-color">
                    <i class="fa-solid fa-exclamation"></i>
                </div>
                <div class="toast-info">
                    "${message}" card already exists
                </div>
            `;
            break;
        
        case "notFound":
            toastElement.classList.add("not-found-toast-border");

            toastElement.innerHTML = `
                <div class="icon-holder not-found-toast-icon-color">
                    <i class="fa-solid fa-xmark"></i>
                </div>
                <div class="toast-info">
                    ${message}
                </div>
            `;
            break;

        case "successfulAdd":
            toastElement.classList.add("successful-add-toast-border");

            toastElement.innerHTML = `
                <div class="icon-holder successful-add-toast-icon-color">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="toast-info">
                    ${message}
                </div>
            `;
            break;

        default:
            break;
    }

    document.body.appendChild(toastElement)

    toastElement.addEventListener("animationend", () => { toastElement.remove() });
}

// openCloseMenu()
function openCloseMenu(){
    const sideMenu = document.querySelector(".side-menu");
    sideMenu.classList.toggle("active");
}

//clearInput()
function clearInput(){
    addInput.value = "";
}

window.addEventListener("DOMContentLoaded", () => {updateUI(LIST, "Nothing here yet");});