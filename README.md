# Distributed Text Editor

For the “Distributed Computing” (CSE354) course’s project we were tasked with creating a distributed text editor in the style of “Google docs”. To this end, this document will serve as documentation and a user guide to how our implementation was done and how to interact with the program.

The distributed text editor needed to have multiple vital features these included, as the name implies, the editor being distributed over multiple clients and/or servers, with the clients being able to contend for shared resources (i.e. the documents) and perform real-time updates to a shared state (i.e. editing the documents). The system should be able to handle the crash of any of the participating nodes and should recover the state of a crashed node once it can resume operation.

## Compiling The Code

The code for the backend is compiled using Lambda, while the front-end is compiled using the user's preferred web browser.

## Running The Editor

The editor can be accessed by running a live server from Visual Studio Code. Alternatively, the website is hosted [here](https://mazen-ghaleb.github.io/Distributed-Text-Editor/index.html)

## Demo Video

A youtube video demo can be found [here](https://youtu.be/2E2165A7NYM)
