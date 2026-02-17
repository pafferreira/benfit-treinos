/* SearchableExerciseSelect.jsx */
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import './SearchableExerciseSelect.css';

const SearchableExerciseSelect = ({
    exercises = [],
    value,
    onChange,
    onCreateNew,
    placeholder = 'Selecione um exercício...',
    className = '',
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Get the selected exercise object
    const selectedExercise = exercises.find(ex => ex.id === value);

    // Filter exercises based on search term
    const filteredExercises = useMemo(() => {
        if (!searchTerm) return exercises;
        const lowerTerm = searchTerm.toLowerCase();
        return exercises.filter(ex =>
            ex.name.toLowerCase().includes(lowerTerm) ||
            (ex.muscle_group && ex.muscle_group.toLowerCase().includes(lowerTerm))
        );
    }, [exercises, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search on close
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (exercise) => {
        onChange(exercise.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreate = () => {
        onCreateNew(searchTerm);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`searchable-select-wrapper ${className}`} ref={wrapperRef}>
            <div
                className={`searchable-select-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100);
                }}
            >
                {selectedExercise ? (
                    <span className="selected-value">{selectedExercise.name}</span>
                ) : (
                    <span className="placeholder-text">{placeholder}</span>
                )}
                <ChevronDown size={16} className="chevron-icon" />
            </div>

            {isOpen && (
                <div className="searchable-dropdown">
                    <div className="search-box">
                        <Search size={16} className="search-icon" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar exercício..."
                            className="search-input"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="options-list">
                        {filteredExercises.length > 0 ? (
                            filteredExercises.map(exercise => (
                                <div
                                    key={exercise.id}
                                    className={`option-item ${value === exercise.id ? 'selected' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(exercise);
                                    }}
                                >
                                    <div className="option-name">{exercise.name}</div>
                                    <div className="option-meta">
                                        {exercise.muscle_group} • {exercise.equipment}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                <span>Nenhum exercício encontrado.</span>
                            </div>
                        )}

                        {searchTerm && !filteredExercises.find(e => e.name.toLowerCase() === searchTerm.toLowerCase()) && (
                             <div
                                className="create-option"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreate();
                                }}
                            >
                                <Plus size={16} />
                                <span>Criar "{searchTerm}"</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableExerciseSelect;
