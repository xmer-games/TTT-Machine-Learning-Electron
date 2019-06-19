import { ipcRenderer } from 'electron';
import Cell from './cell';
require('./board.scss');

const defaultBoard = [
    null, null, null,
    null, null, null,
    null, null, null
];

class Board extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            board: [...defaultBoard],
            turn: true
        };

        ipcRenderer.on('Reset', () => {
            this.reset();
        });

        ipcRenderer.on('Winner', (e, who) => {
            alert(`${who} WINS!`);
            this.reset();
        });

        ipcRenderer.on('npcTurn', (e, pos) => {
            this.select(pos, true); 
        });
    }

    reset() {
        this.setState({
            board: [...defaultBoard],
            turn: true
        });
    }

    select(index, npc) {
        if(!this.state.turn && !npc)
            return;

        this.setState(pState => {
            var board = pState.board;
            board[index] = npc ? "O" : "X";

            if(!npc)
                ipcRenderer.send("board:check", board);

            return {
                board,
                turn: npc
            }
        });
    }

    render() {
        return (
            <div className="Board">
                {this.state.board.map((cell, i) => {
                    return (
                        <Cell click={() => {(index => this.select(index))(i)}}
                        >
                            {cell}
                        </Cell>
                    );
                })}
            </div>
        )
    }
};

export default Board;