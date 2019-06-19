class Cell extends React.Component {
    // Checks to ensure the cell doesn't already have a value
    click() {
        if(!this.props.children)
            this.props.click();
    }

    render() {
        return (
            <div className="Cell"
                onClick={() => this.click()}
            >
                {this.props.children}
            </div>
        )
    }
};

export default Cell;