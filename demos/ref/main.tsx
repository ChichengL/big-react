import ReactDOM from 'react-dom/client';
import { useState, useRef, useEffect } from 'react';
// import { useState } from 'react';
function App() {
	const [isDel, setDel] = useState(false);
	const divRef = useRef(null);

	console.warn('render divRef', divRef.current);

	useEffect(() => {
		console.warn('commit divRef', divRef.current);
	}, []);

	return (
		<div ref={divRef} onClick={() => setDel(true)}>
			{isDel ? null : <Child />}
		</div>
	);
}

function Child() {
	return <p ref={(dom) => console.warn('dom is:', dom)}>Child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
