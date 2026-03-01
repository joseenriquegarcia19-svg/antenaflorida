
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getValidImageUrl } from '@/lib/utils';
import { ProgramContext } from '../layouts/ProgramLayout';
import { Users } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
  slug?: string;
}

const ProgramTeamPage: React.FC = () => {
  const programContext = useContext(ProgramContext);
  const program = programContext?.program;
  const programColor = programContext?.programColor || '#FFC700';

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamForProgram = async (programId: string) => {
      setLoading(true);
      try {
        const { data: showTeamData, error: showTeamError } = await supabase
          .from('show_team_members')
          .select('team_member_id')
          .eq('show_id', programId);

        if (showTeamError) throw showTeamError;
        
        const memberIds = showTeamData.map((m) => m.team_member_id);
        if (memberIds.length === 0) {
          setTeam([]);
          return;
        }

        const { data, error } = await supabase
          .from('team_members')
          .select('id, name, role, image_url, slug')
          .in('id', memberIds)
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setTeam(data || []);
      } catch (error) {
        console.error('Error fetching team for program:', error);
        setTeam([]);
      } finally {
        setLoading(false);
      }
    };

    if (program?.id) {
      fetchTeamForProgram(program.id);
    } else {
      setLoading(false);
      setTeam([]);
    }
  }, [program?.id]);

  return (
    <div className="text-white p-4 font-['Plus_Jakarta_Sans']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-black text-white tracking-tighter sm:text-6xl">
            Nuestro <span style={{ color: programColor }}>Equipo</span>
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-white/10 rounded-2xl"></div>
                <div className="h-4 bg-white/10 rounded mt-4 w-3/4 mx-auto"></div>
                <div className="h-3 bg-white/10 rounded mt-2 w-1/2 mx-auto"></div>
              </div>
            ))}
          </div>
        ) : team.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {team.map((member) => (
              <Link
                to={`/equipo/${member.slug || member.id}`}
                key={member.id}
                className="group relative block aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-lg transform transition-transform duration-300 ease-in-out hover:scale-105"
              >
                <img
                  src={getValidImageUrl(member.image_url, 'avatar')}
                  alt={member.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-center text-white">
                  <h3 className="font-bold text-base leading-tight tracking-tight text-shadow-md">{member.name}</h3>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mt-1 opacity-80"
                    style={{ color: programColor }}
                  >{member.role}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-white/5 rounded-2xl">
            <Users className="mx-auto text-white/20" size={48} />
            <h3 className="mt-4 text-xl font-bold text-white">Equipo no asignado</h3>
            <p className="mt-2 text-sm text-white/50">Actualmente, no hay miembros del equipo asignados a este programa.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramTeamPage;
