function search_button() {
    let search_term = document.getElementById('search-box').value
    if (search_term == ""){
      return false;
    }

    window.location.assign(pathRoot+"/views/searchDocuments.html?searchterm="+ search_term);
    return false;
  }

function generateNavBar() {
  
    let nav = document.createElement("nav");
    nav.classList.add(
      "navbar",
      "navbar-dark",
      "bg-dark",
      "justify-content-between"
    );
    nav.innerHTML = `<a class="navbar-brand" href="${pathRoot}/index.html">
    <button class="btn btn-outline-primary my-2 my-sm-0" style="border:none; color:lightblue;" id="HomePageButton">Shared Document Editor</button></a>

      </div>
      <div style="display:inline;width:45%;" id="searchContainer">
        <form style="display:inline;"class="form-inline" onsubmit="return search_button()">
        <!--TODO  -->
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
    document.body.append(nav);
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