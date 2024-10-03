/**
 * 卡片组件
 * @param {*} param0
 * @returns
 */
const Card = (props) => {
  const { children, headerSlot, className } = props;
  const { isDarkMode } = useNextGlobal(); // 假设你有一个全局状态来判断是否是暗色模式

  // 根据 isDarkMode 的值来设置背景颜色
  const backgroundColor = isDarkMode? '#c9d6df' : '#f7fbfc';

  return (
    <div className={className}>
      <>{headerSlot}</>
      <section className="shadow px-2 py-4 bg-white dark:bg-hexo-black-gray hover:shadow-xl duration-200" style={{ backgroundColor }}>
        {children}
      </section>
    </div>
  );
};

export default Card;
