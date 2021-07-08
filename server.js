const express=require("express");
const app=express();
const http=require("http");
const server=http.createServer(app);
const socket=require("socket.io"); 
const io=socket(server);


const rooms={}; //An empty intitial collection

io.on("connection",socket=>{

    socket.on("join room",roomID=>{
        if(rooms[roomID]){                  // if room already exsists in the collection
            rooms[roomID].push(socket.id);  //push new user in room
        
        }else{ //if no room with roomID exists
            rooms[roomID]=[socket.id];  

        }

        const otherUser=rooms[roomID].find(id=> 
            id!==socket.id                  //Checing for other user in room
        );

        if (otherUser){             // if other user present
            socket.emit("other user",otherUser);
            socket.to(otherUser).emit("user joined",socket.id);
        }
        
    });

    socket.on("offer",payload=>{
        io.to(payload.target).emit("offer",payload);// send event 
    });

    socket.on("answer",payload=>{
        io.to(payload.target).emit("answer",payload);// sending back event 
    });

    socket.on("ice-candidate",incoming=>{
        io.to(incoming.target).emit("ice-candidate",incoming.candidate);// sending back event 
    });

    socket.on("disconnect-call",payload=>{
        console.log("Call to be disconnected");
        if(payload.target){
            io.to(payload.target).emit("disconnect-call",payload);// sending back event
        }         
        rooms[payload.room].pop(payload.caller);
    });

});



server.listen(8000,()=>{
    console.log("Server running on port 8000")
});