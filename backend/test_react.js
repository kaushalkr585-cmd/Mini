const mongoose = require('mongoose');
const Message = require('./models/Message');

async function testReact() {
  await mongoose.connect('mongodb+srv://kushal:kushal1234@cluster0.uzdkopl.mongodb.net/nishy');
  try {
    let msg = await Message.findOne();
    if (!msg) { console.log('No message found'); return; }
    
    console.log('Found message:', msg._id);
    console.log('Reactions before:', msg.reactions);
    
    if (!msg.reactions) {
      msg.set('reactions', []);
    }
    
    // mock user id
    const userId = new mongoose.Types.ObjectId();
    const emoji = "❤️";
    
    const existingIdx = msg.reactions.findIndex(r => r.userId.toString() === userId.toString() && r.emoji === emoji);
    if (existingIdx > -1) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ userId, emoji });
    }
    
    msg.markModified('reactions');
    await msg.save();
    console.log('Saved successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

testReact();
