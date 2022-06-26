function search_button() {
    let search_term = document.getElementById('search-box').value
    if (search_term == ""){
      return false;
    }

    window.location.assign(pathRoot+"/views/searchDocuments.html?searchterm="+ search_term);
    return false;
  }

function generateNavBar() {
    document.body.append(generateNav());
}

function generateNav() {
  
  let navDiv = document.createElement("div");
  navDiv.style.display = "none";
  navDiv.id= "navDiv";
  let nav = document.createElement("nav");
  nav.classList.add(
    "navbar",
    "navbar-dark",
    "bg-dark",
    "justify-content-between"
  );
  let homePath = "/index.html";
  if (JSON.parse(localStorage.getItem("LoggedIn")) !== "True") {
    homePath = "/views/SignIn.html";
  }
  nav.innerHTML = `
  <a class="navbar-brand" href="${pathRoot+homePath}">
  <button class="btn btn-outline-primary my-2 my-sm-0" style="border:none; color:lightblue;" id="HomePageButton">Shared Document Editor</button></a>

    </div>
    <div style="display:inline;width:45%;" id="searchContainer">
      <form style="display:inline;"class="form-inline" onsubmit="return search_button()">
        <input type="search" style="width:60%;" class="form-control mr-sm-2" placeholder="Search for document by Name" aria-label="Search" id="search-box" />
        <button class="btn btn-secondary my-2 my-sm-0" style="border:none; color:lightyellow;" type="submit">Search</button>
      </form>
    </div>
      <div style="display:inline;" id="profile-container">
      <a style="color:lightblue;" id="signIn" href="${pathRoot}/views/SignIn.html">
        <button class="btn btn-outline-success my-2 my-sm-0" style="text-decoration:underline;margin:5px; border:none; color:lightblue;">Sign In</button></a>

        <a style="color:lightblue;" id="signUp" href="${pathRoot}/views/SignUp.html">
        <button class="btn btn-outline-success my-2 my-sm-0" style="text-decoration:underline;border:none; color:lightblue;">Sign Up</button></a>
      </div>
  `;
    navDiv.append(nav);
    return navDiv;
}

function checkLogged(){
  if (JSON.parse(localStorage.getItem("LoggedIn")) === "True") {
    if(document.IS_SIGN){
      window.location.assign(pathRoot)
    }
      loggedAccount = JSON.parse(localStorage.getItem("AccLoggedIn"));
      //console.log(loggedAccount)
      AWS.call("loginAccount", { "userName": loggedAccount.userName, "userPassword": loggedAccount.userPassword})
  }
  else {
    document.getElementById("navDiv").style.display = "block";
      if(!document.IS_SIGN){
        window.location.assign(pathRoot+'/views/SignIn.html')
      }
  }
}

function sign_out(){
  localStorage.setItem("LoggedIn", JSON.stringify("False"));
  localStorage.setItem("AccLoggedIn", null);
  document.getElementsByTagName("nav")[0].remove();
  document.body.prepend(generateNav());
  checkLogged();
}

function display_account_data(goBack) {
  if (JSON.parse(localStorage.getItem("LoggedIn")) !== "True") return;

  let account = JSON.parse(localStorage.getItem("AccLoggedIn"));
  let sign_in_button = document.getElementById("signIn");
  let sign_up_button = document.getElementById("signUp");
  let parent_node = sign_in_button.parentElement;
  parent_node.removeChild(sign_in_button);
  parent_node.removeChild(sign_up_button);
  let container = document.createElement("div");
  container.id = "profile-container";
  container.innerHTML = `
  <button style="height:50px;width:50px;padding:10px; text-decoration:underline; border:none; color:lightblue;"class="btn btn-outline-secondary my-2 my-sm-0" id="signOut"><img src='${pathRoot}/media/profile.png' style='cursor:pointer;width:100%;height:100%'></button>
  <button style="text-decoration:underline; border:none; color:lightblue;"class="btn btn-outline-danger my-2 my-sm-0" id="signOut" onclick="window.location.assign(pathRoot+'/views/changePassword.html')">Change Password</button>
  <button style="text-decoration:underline; border:none; color:lightblue;"class="btn btn-outline-danger my-2 my-sm-0" id="signOut" onclick="sign_out()">Sign Out</button>
  `;

  container.style.display = "inline"; 
  parent_node.appendChild(container);

}

let pathRoot = "..";
if(document.IS_INDEX) pathRoot = ".";



// document.getElementsByTagName("head")[0].innerHTML += ` <meta charset="UTF-8" />
// <meta http-equiv="X-UA-Compatible" content="IE=edge" />
// <meta name="viewport" content="width=device-width, initial-scale=1.0" />
// <!-- Include stylesheets -->
// <link rel="stylesheet" type="text/css" href="${pathRoot}/styles/style.css" />
// <link
//   rel="stylesheet"
//   href="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/css/bootstrap.min.css"
//   integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm"
//   crossorigin="anonymous"
// />
// <script
//   src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
//   integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
//   crossorigin="anonymous"
// ></script>
// <script
//   src="https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js"
//   integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
//   crossorigin="anonymous"
// ></script>
// <script
//   src="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/js/bootstrap.min.js"
//   integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
//   crossorigin="anonymous"
// ></script>
// <link href="https://cdn.quilljs.com/2.0.0-dev.4/quill.snow.css" rel="stylesheet" />

// window.onbeforeunload = AWS.sock.close()  // Close Socket on closing site